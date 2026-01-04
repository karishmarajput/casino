const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Use the same data directory as db.js
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'ledger.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Helper function to generate password from username
function generatePassword(username) {
  const firstWord = username.trim().split(/\s+/)[0];
  return `${firstWord}123`;
}

// Helper function to write user data to Excel
function writeToExcel(userData) {
  const excelPath = path.join(__dirname, 'src', 'users.xlsx');
  let workbook;
  let worksheet;
  
  // Check if file exists
  if (fs.existsSync(excelPath)) {
    workbook = XLSX.readFile(excelPath);
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
  } else {
    // Create new workbook
    workbook = XLSX.utils.book_new();
    worksheet = XLSX.utils.aoa_to_sheet([['User ID', 'Username', 'Password']]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
  }
  
  // Convert sheet to JSON to append data
  const existingData = XLSX.utils.sheet_to_json(worksheet);
  
  // Check if user already exists in Excel
  const userExists = existingData.some(row => row['User ID'] === userData.id);
  
  if (!userExists) {
    // Add new user data
    existingData.push({
      'User ID': userData.id,
      'Username': userData.name,
      'Password': userData.password
    });
    
    // Create new sheet with updated data
    const newWorksheet = XLSX.utils.json_to_sheet(existingData);
    workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
    
    // Write to file
    XLSX.writeFile(workbook, excelPath);
  }
}

// Migrate passwords for all existing users
function migratePasswords() {
  return new Promise((resolve, reject) => {
    console.log('Starting password migration...');
    
    // Get all users without passwords
    db.all("SELECT id, name, password FROM users", (err, users) => {
      if (err) {
        console.error('Error fetching users:', err);
        return reject(err);
      }
      
      console.log(`Found ${users.length} users to process`);
      
      let processed = 0;
      let errors = [];
      
      users.forEach((user) => {
        // Skip if password already exists
        if (user.password) {
          console.log(`User ${user.name} already has a password, skipping...`);
          processed++;
          if (processed === users.length) {
            console.log('Migration completed!');
            resolve();
          }
          return;
        }
        
        // Generate password
        const plainPassword = generatePassword(user.name);
        const hashedPassword = bcrypt.hashSync(plainPassword, 10);
        
        // Update user with hashed password
        db.run(
          "UPDATE users SET password = ? WHERE id = ?",
          [hashedPassword, user.id],
          function(updateErr) {
            if (updateErr) {
              console.error(`Error updating password for user ${user.name}:`, updateErr);
              errors.push({ user: user.name, error: updateErr.message });
            } else {
              console.log(`✓ Updated password for user: ${user.name} (ID: ${user.id})`);
              
              // Write to Excel
              writeToExcel({
                id: user.id,
                name: user.name,
                password: plainPassword
              });
            }
            
            processed++;
            if (processed === users.length) {
              if (errors.length > 0) {
                console.error('\nErrors occurred:');
                errors.forEach(e => console.error(`  - ${e.user}: ${e.error}`));
              }
              console.log('\nMigration completed!');
              console.log(`Processed: ${users.length} users`);
              console.log(`Errors: ${errors.length}`);
              console.log(`Excel file location: ${path.join(__dirname, 'users.xlsx')}`);
              resolve();
            }
          }
        );
      });
      
      if (users.length === 0) {
        console.log('No users found to migrate.');
        resolve();
      }
    });
  });
}

// Run migration
migratePasswords()
  .then(() => {
    console.log('Password migration script completed successfully.');
    db.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Password migration failed:', err);
    db.close();
    process.exit(1);
  });

