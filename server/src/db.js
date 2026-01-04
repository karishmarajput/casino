const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const persistentDataDir = process.env.DB_DATA_DIR || 
                          path.join(__dirname, '..', 'data');

const dataDir = persistentDataDir;
const dbPath = path.join(dataDir, 'ledger.db');
const oldDbPath = path.join(__dirname, 'ledger.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(oldDbPath) && !fs.existsSync(dbPath)) {
  try {
    fs.copyFileSync(oldDbPath, dbPath);
    console.log('Database migrated successfully from', oldDbPath, 'to', dbPath);
  } catch (err) {
    console.error('Error migrating database:', err);
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  } else {
    console.log('Database connected at:', dbPath);
    db.run('PRAGMA journal_mode = WAL', (err) => {
      if (err) {
        console.error('Error setting WAL mode:', err);
      } else {
        console.log('Database WAL mode enabled');
      }
    });
    db.run('PRAGMA synchronous = NORMAL', (err) => {
      if (err) {
        console.error('Error setting synchronous mode:', err);
      }
    });
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('Error enabling foreign keys:', err);
      }
    });
  }
});

process.on('SIGINT', () => {
  console.log('\nClosing database connection...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nClosing database connection...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        is_captain INTEGER DEFAULT 0,
        captain_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (captain_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS pot (
        id INTEGER PRIMARY KEY,
        balance REAL NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER,
        to_user_id INTEGER,
        from_pot INTEGER DEFAULT 0,
        to_pot INTEGER DEFAULT 0,
        amount REAL NOT NULL,
        game_id INTEGER,
        game_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users(id),
        FOREIGN KEY (to_user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_type TEXT NOT NULL DEFAULT '7up7down',
        entry_fee REAL NOT NULL,
        pot_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        winner TEXT,
        spin_result INTEGER,
        round_number INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS game_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        choice TEXT,
        number INTEGER,
        round_number INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(game_id, user_id, round_number)
      )`);

      runMigrations().then(() => {
        initializePot();
        resolve();
      }).catch(reject);
    });
  });
}

function runMigrations() {
  return new Promise((resolve) => {
    db.all("PRAGMA table_info(users)", (err, columns) => {
      if (err) {
        console.error("Error checking table info:", err);
        return resolve();
      }

      const columnNames = columns.map(col => col.name);
      const needsIsCaptain = !columnNames.includes('is_captain');
      const needsCaptainId = !columnNames.includes('captain_id');
      const needsPassword = !columnNames.includes('password');

      if (needsIsCaptain) {
        db.run("ALTER TABLE users ADD COLUMN is_captain INTEGER DEFAULT 0", (err) => {
          if (err) {
            console.error("Error adding is_captain column:", err);
          } else {
            console.log("Added is_captain column to users table");
          }
        });
      }

      if (needsPassword) {
        db.run("ALTER TABLE users ADD COLUMN password TEXT", (err) => {
          if (err) {
            console.error("Error adding password column:", err);
          } else {
            console.log("Added password column to users table");
          }
        });
      }

      if (needsCaptainId) {
        db.run("ALTER TABLE users ADD COLUMN captain_id INTEGER", (err) => {
          if (err) {
            console.error("Error adding captain_id column:", err);
          } else {
            console.log("Added captain_id column to users table");
          }
        });
      }
    });

    db.all("PRAGMA table_info(transactions)", (err, columns) => {
      if (err) {
        console.error("Error checking transactions table info:", err);
        return resolve();
      }

      const columnNames = columns.map(col => col.name);
      const needsFromPot = !columnNames.includes('from_pot');
      const needsToPot = !columnNames.includes('to_pot');
      const needsGameId = !columnNames.includes('game_id');
      const needsGameType = !columnNames.includes('game_type');

      if (needsFromPot) {
        db.run("ALTER TABLE transactions ADD COLUMN from_pot INTEGER DEFAULT 0", (err) => {
          if (err) {
            console.error("Error adding from_pot column:", err);
          } else {
            console.log("Added from_pot column to transactions table");
          }
        });
      }

      if (needsToPot) {
        db.run("ALTER TABLE transactions ADD COLUMN to_pot INTEGER DEFAULT 0", (err) => {
          if (err) {
            console.error("Error adding to_pot column:", err);
          } else {
            console.log("Added to_pot column to transactions table");
          }
        });
      }

      if (needsGameId) {
        db.run("ALTER TABLE transactions ADD COLUMN game_id INTEGER", (err) => {
          if (err) {
            console.error("Error adding game_id column:", err);
          } else {
            console.log("Added game_id column to transactions table");
          }
        });
      }

      if (needsGameType) {
        db.run("ALTER TABLE transactions ADD COLUMN game_type TEXT", (err) => {
          if (err) {
            console.error("Error adding game_type column:", err);
          } else {
            console.log("Added game_type column to transactions table");
          }
        });
      }
    });

    db.run("DELETE FROM users WHERE name = 'Pot'", (err) => {
      if (err) {
        console.error("Error removing Pot user:", err);
      }
    });

    db.all("PRAGMA table_info(games)", (err, columns) => {
      if (err) {
        console.error("Error checking games table info:", err);
        return resolve();
      }
      const columnNames = columns.map(col => col.name);
      if (!columnNames.includes('game_type')) {
        db.run("ALTER TABLE games ADD COLUMN game_type TEXT NOT NULL DEFAULT '7up7down'", (err) => {
          if (err) {
            console.error("Error adding game_type column:", err);
          } else {
            console.log("Added game_type column to games table");
          }
        });
      }
      if (!columnNames.includes('spin_result')) {
        db.run("ALTER TABLE games ADD COLUMN spin_result INTEGER", (err) => {
          if (err) {
            console.error("Error adding spin_result column:", err);
          } else {
            console.log("Added spin_result column to games table");
          }
        });
      }
      if (!columnNames.includes('round_number')) {
        db.run("ALTER TABLE games ADD COLUMN round_number INTEGER DEFAULT 1", (err) => {
          if (err) {
            console.error("Error adding round_number column:", err);
          } else {
            console.log("Added round_number column to games table");
          }
        });
      }
    });

    db.all("PRAGMA table_info(game_participants)", (err, columns) => {
      if (err) {
        console.error("Error checking game_participants table info:", err);
        return resolve();
      }
      const columnNames = columns.map(col => col.name);
      if (!columnNames.includes('number')) {
        db.run("ALTER TABLE game_participants ADD COLUMN number INTEGER", (err) => {
          if (err) {
            console.error("Error adding number column:", err);
          } else {
            console.log("Added number column to game_participants table");
          }
        });
      }
      if (!columnNames.includes('round_number')) {
        db.run("ALTER TABLE game_participants ADD COLUMN round_number INTEGER DEFAULT 1", (err) => {
          if (err) {
            console.error("Error adding round_number column:", err);
          } else {
            console.log("Added round_number column to game_participants table");
          }
        });
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error("Error creating groups table:", err);
      } else {
        console.log("Groups table created or already exists");
      }
    });
    
    db.run(`CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(group_id, user_id)
    )`, (err) => {
      if (err) {
        console.error("Error creating group_members table:", err);
      } else {
        console.log("Group_members table created or already exists");
      }
      resolve();
    });
  });
}

function initializePot() {
  db.get("SELECT id FROM pot WHERE id = 1", (err, row) => {
    if (!row) {
      db.run("INSERT INTO pot (id, balance) VALUES (1, 0)");
    }
  });
}

module.exports = {
  db,
  initializeDatabase
};

