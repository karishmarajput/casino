const { db } = require('./db');
const bcrypt = require('bcrypt');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Helper function to write user data to Excel
function writeToExcel(userData) {
  try {
    // Excel file will be in the server root directory
    const excelPath = path.join(__dirname, '..', 'users.xlsx');
    let workbook;
    let worksheet;
    let existingData = [];
    
    // Check if file exists
    if (fs.existsSync(excelPath)) {
      workbook = XLSX.readFile(excelPath);
      const sheetName = workbook.SheetNames[0];
      worksheet = workbook.Sheets[sheetName];
      existingData = XLSX.utils.sheet_to_json(worksheet);
    } else {
      // Create new workbook
      workbook = XLSX.utils.book_new();
      existingData = [];
    }
    
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
      worksheet = XLSX.utils.json_to_sheet(existingData);
      workbook.Sheets['Users'] = worksheet;
      
      // Write to file
      XLSX.writeFile(workbook, excelPath);
    }
  } catch (error) {
    console.error('Error writing to Excel:', error);
    // Don't throw error, just log it so user creation can continue
  }
}

// Helper function to generate password from username
function generatePassword(username) {
  const firstWord = username.trim().split(/\s+/)[0];
  return `${firstWord}123`;
}

const userService = {
  getUsersRanking: () => {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT id, name, balance, is_captain, captain_id FROM users ORDER BY balance DESC",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getUsers: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT id, name, balance, is_captain FROM users ORDER BY name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getCaptains: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT id, name, balance FROM users WHERE is_captain = 1 ORDER BY name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  registerCaptains: (names, initialAmount) => {
    return new Promise((resolve, reject) => {
      const amountInt = parseInt(initialAmount);
      if (isNaN(amountInt) || amountInt <= 0) {
        return reject({ error: 'Invalid initial amount. Must be a positive number.' });
      }
      
      const stmt = db.prepare("INSERT INTO users (name, balance, is_captain, password) VALUES (?, ?, 1, ?)");
      const errors = [];
      const createdUsers = [];

      names.forEach((name) => {
        if (name.trim()) {
          const trimmedName = name.trim();
          const plainPassword = generatePassword(trimmedName);
          const hashedPassword = bcrypt.hashSync(plainPassword, 10);
          
          stmt.run(trimmedName, amountInt, hashedPassword, function(err) {
            if (err && err.message.includes('UNIQUE constraint')) {
              errors.push(`Captain "${name}" already exists`);
            } else if (err) {
              errors.push(`Error creating captain "${name}": ${err.message}`);
            } else {
              // Write to Excel
              createdUsers.push({
                id: this.lastID,
                name: trimmedName,
                password: plainPassword
              });
            }
          });
        }
      });

      stmt.finalize((err) => {
        if (err) return reject(err);
        if (errors.length > 0) return reject({ errors });
        
        // Write all created users to Excel
        createdUsers.forEach(user => {
          writeToExcel(user);
        });
        
        resolve({ message: 'Captains registered successfully' });
      });
    });
  },

  registerMembers: (names, initialAmount, captainId) => {
    return new Promise((resolve, reject) => {
      const amountInt = parseInt(initialAmount);
      if (isNaN(amountInt) || amountInt <= 0) {
        return reject({ error: 'Invalid initial amount. Must be a positive number.' });
      }
      
      db.get("SELECT id FROM users WHERE id = ? AND is_captain = 1", [captainId], (err, captain) => {
        if (err) return reject(err);
        if (!captain) return reject({ error: 'Invalid captain selected' });

        const stmt = db.prepare("INSERT INTO users (name, balance, is_captain, captain_id, password) VALUES (?, ?, 0, ?, ?)");
        const errors = [];
        const createdUsers = [];

        names.forEach((name) => {
          if (name.trim()) {
            const trimmedName = name.trim();
            const plainPassword = generatePassword(trimmedName);
            const hashedPassword = bcrypt.hashSync(plainPassword, 10);
            
            stmt.run(trimmedName, amountInt, captainId, hashedPassword, function(err) {
              if (err && err.message.includes('UNIQUE constraint')) {
                errors.push(`User "${name}" already exists`);
              } else if (err) {
                errors.push(`Error creating user "${name}": ${err.message}`);
              } else {
                // Write to Excel
                createdUsers.push({
                  id: this.lastID,
                  name: trimmedName,
                  password: plainPassword
                });
              }
            });
          }
        });

        stmt.finalize((err) => {
          if (err) return reject(err);
          if (errors.length > 0) return reject({ errors });
          
          // Write all created users to Excel
          createdUsers.forEach(user => {
            writeToExcel(user);
          });
          
          resolve({ message: 'Family members registered successfully' });
        });
      });
    });
  },

  deleteUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT id, is_captain FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) return reject(err);
        if (!user) return reject({ error: 'User not found' });
        if (user.is_captain === 1) {
          return reject({ error: 'Cannot delete a captain. Delete all family members first.' });
        }

        db.run("DELETE FROM users WHERE id = ?", [userId], (err) => {
          if (err) return reject(err);
          resolve({ message: 'User deleted successfully' });
        });
      });
    });
  },

  login: (username, password) => {
    return new Promise((resolve, reject) => {
      const normalizedInput = username.trim().replace(/\s+/g, ' ');
      db.all("SELECT id, name, balance, password FROM users", (err, allUsers) => {
        if (err) return reject(err);
        const user = allUsers.find(u => {
          const normalizedDbName = u.name.trim().replace(/\s+/g, ' ');
          return normalizedDbName.toLowerCase() === normalizedInput.toLowerCase();
        });
        if (!user) {
          return reject({ error: 'User not found' });
        }
        
        if (!user.password) {
          const storedName = user.name.trim();
          const firstWord = storedName.split(/\s+/)[0];
          const expectedPassword = `${firstWord}123`;
          if (password !== expectedPassword) {
            return reject({ error: 'Invalid credentials' });
          }
          return resolve({ id: user.id, name: user.name, balance: user.balance });
        }
        
        // Check hashed password
        const storedName = user.name.trim();
        const firstWord = storedName.split(/\s+/)[0];
        const expectedPassword = `${firstWord}123`;
        
        if (bcrypt.compareSync(password, user.password)) {
          resolve({ id: user.id, name: user.name, balance: user.balance });
        } else {
          reject({ error: 'Invalid credentials' });
        }
      });
    });
  },

  getUserById: (userId) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT id, name, balance FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) return reject(err);
        if (!user) return reject({ error: 'User not found' });
        resolve(user);
      });
    });
  },

  getUserTransactions: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT t.id, t.amount, t.created_at, t.from_pot, t.to_pot, t.game_id, t.game_type as transaction_game_type,
                u1.name as from_user, u2.name as to_user,
                g.game_type as game_table_game_type, g.id as game_table_id
         FROM transactions t
         LEFT JOIN users u1 ON t.from_user_id = u1.id
         LEFT JOIN users u2 ON t.to_user_id = u2.id
         LEFT JOIN games g ON t.game_id = g.id
         WHERE t.from_user_id = ? OR t.to_user_id = ?
         ORDER BY t.created_at DESC
         LIMIT 100`,
        [userId, userId],
        (err, rows) => {
          if (err) {
            console.error('Error fetching user transactions:', err);
            return reject(err);
          }
          
          const gameNameMap = {
            '7up7down': '7 Up & 7 Down',
            'roulette': 'Roulette',
            'rolltheball': 'Roll the Ball',
            'poker': 'Poker',
            'dealnodeal': 'Deal No Deal'
          };
          
          const formattedRows = rows.map(row => {
            let gameName = null;
            const gameType = row.transaction_game_type || row.game_table_game_type;
            if (gameType) {
              const gameTypeLower = String(gameType).toLowerCase().trim();
              gameName = gameNameMap[gameTypeLower] || gameType;
            }
            return {
              ...row,
              game_name: gameName,
              game_type: gameType
            };
          });
          
          resolve(formattedRows);
        }
      );
    });
  },

  getUserGames: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT g.*, gp.user_id as participant_user_id
         FROM games g
         INNER JOIN game_participants gp ON g.id = gp.game_id
         WHERE gp.user_id = ?
         ORDER BY g.created_at DESC
         LIMIT 50`,
        [userId],
        (err, rows) => {
          if (err) {
            console.error('Error fetching user games:', err);
            return reject(err);
          }
          
          const gameNameMap = {
            '7up7down': '7 Up & 7 Down',
            'roulette': 'Roulette',
            'rolltheball': 'Roll the Ball',
            'poker': 'Poker',
            'dealnodeal': 'Deal No Deal'
          };
          
          const formattedRows = rows.map(row => {
            const gameType = String(row.game_type).toLowerCase().trim();
            return {
              ...row,
              game_name: gameNameMap[gameType] || row.game_type
            };
          });
          
          resolve(formattedRows);
        }
      );
    });
  },

  updateBalance: (userId, amount, gameType) => {
    return new Promise((resolve, reject) => {
      const amountInt = parseInt(amount);
      if (isNaN(amountInt)) {
        return reject({ error: 'Invalid amount. Must be a number.' });
      }
      
      db.run("BEGIN TRANSACTION", (beginErr) => {
        if (beginErr) return reject(beginErr);

        db.get("SELECT id, name, balance FROM users WHERE id = ?", [userId], (err, user) => {
          if (err) {
            db.run("ROLLBACK", () => {});
            return reject(err);
          }
          if (!user) {
            db.run("ROLLBACK", () => {});
            return reject({ error: 'User not found' });
          }

          const newBalance = parseInt(user.balance) + amountInt;
          if (newBalance < 0) {
            db.run("ROLLBACK", () => {});
            return reject({ error: 'Insufficient balance' });
          }

          db.run("UPDATE users SET balance = ? WHERE id = ?", [newBalance, userId], (err) => {
            if (err) {
              db.run("ROLLBACK", () => {});
              return reject(err);
            }

            const isDeduct = amountInt < 0;
            db.run(
              "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_type) VALUES (?, ?, ?, ?, ?, ?)",
              [isDeduct ? userId : null, isDeduct ? null : userId, 0, 0, Math.abs(amountInt), gameType || null],
              (err) => {
                if (err) {
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    db.run("ROLLBACK", () => {});
                    return reject(commitErr);
                  }

                  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, updatedUser) => {
                    if (err) return reject(err);
                    resolve({
                      message: `Balance ${isDeduct ? 'deducted' : 'added'} successfully`,
                      user: updatedUser
                    });
                  });
                });
              }
            );
          });
        });
      });
    });
  }
};

const potService = {
  getPotBalance: () => {
    return new Promise((resolve, reject) => {
      db.get("SELECT balance FROM pot WHERE id = 1", (err, row) => {
        if (err) reject(err);
        else {
          const balance = row ? Math.round(row.balance) : 0;
          resolve({ balance: balance });
        }
      });
    });
  }
};

const transactionService = {
  createTransaction: (fromUserId, toUserId, fromPot, toPot, amount) => {
    return new Promise((resolve, reject) => {
      const amountInt = parseInt(amount);
      if (isNaN(amountInt) || amountInt <= 0) {
        return reject({ error: 'Invalid amount. Must be a positive number.' });
      }
      
      const isFromPot = fromPot === true || fromPot === 1;
      const isToPot = toPot === true || toPot === 1;

      db.serialize(() => {
        if (isFromPot) {
          db.get("SELECT balance FROM pot WHERE id = 1", (err, pot) => {
            if (err) return reject(err);
            const potBalance = Math.round(pot ? pot.balance : 0);
            if (potBalance < amountInt) {
              return reject({ error: 'Insufficient balance in Pot' });
            }

            db.get("SELECT id FROM users WHERE id = ?", [toUserId], (err, toUser) => {
              if (err) return reject(err);
              if (!toUser) return reject({ error: 'To user not found' });

              db.run("UPDATE pot SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [amountInt], (err) => {
                if (err) return reject(err);

                db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amountInt, toUserId], (err) => {
                  if (err) return reject(err);

                  db.run(
                    "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount) VALUES (?, ?, 1, 0, ?)",
                    [null, toUserId, amountInt],
                    (err) => {
                      if (err) return reject(err);
                      resolve({ message: 'Transaction completed successfully' });
                    }
                  );
                });
              });
            });
          });
        } else if (isToPot) {
          db.get("SELECT balance FROM users WHERE id = ?", [fromUserId], (err, fromUser) => {
            if (err) return reject(err);
            if (!fromUser) return reject({ error: 'From user not found' });
            if (fromUser.balance < amountInt) return reject({ error: 'Insufficient balance' });

            db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [amountInt, fromUserId], (err) => {
              if (err) return reject(err);

              db.run("UPDATE pot SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [amountInt], (err) => {
                if (err) return reject(err);

                db.run(
                  "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount) VALUES (?, ?, 0, 1, ?)",
                  [fromUserId, null, amountInt],
                  (err) => {
                    if (err) return reject(err);
                    resolve({ message: 'Transaction completed successfully' });
                  }
                );
              });
            });
          });
        } else {
          db.get("SELECT balance FROM users WHERE id = ?", [fromUserId], (err, fromUser) => {
            if (err) return reject(err);
            if (!fromUser) return reject({ error: 'From user not found' });
            if (fromUser.balance < amountInt) return reject({ error: 'Insufficient balance' });

            db.get("SELECT id FROM users WHERE id = ?", [toUserId], (err, toUser) => {
              if (err) return reject(err);
              if (!toUser) return reject({ error: 'To user not found' });

              db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [amountInt, fromUserId], (err) => {
                if (err) return reject(err);

                db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amountInt, toUserId], (err) => {
                  if (err) return reject(err);

                  db.run(
                    "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount) VALUES (?, ?, 0, 0, ?)",
                    [fromUserId, toUserId, amountInt],
                    (err) => {
                      if (err) return reject(err);
                      resolve({ message: 'Transaction completed successfully' });
                    }
                  );
                });
              });
            });
          });
        }
      });
    });
  },

  createBatchTransactions: (transactions) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);

          let currentIndex = 0;
          let hasError = false;

          function processNextTransaction() {
            if (hasError || currentIndex >= transactions.length) {
              if (hasError) {
                db.run("ROLLBACK", () => {});
              } else {
                db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    db.run("ROLLBACK", () => {});
                    return reject(commitErr);
                  }
                  resolve({ message: `All ${transactions.length} transactions completed successfully` });
                });
              }
              return;
            }

            const txn = transactions[currentIndex];
            const { fromUserId, toUserId, fromPot, toPot, amount } = txn;
            const amountInt = parseInt(amount);
            const isFromPot = fromPot === true || fromPot === 1;
            const isToPot = toPot === true || toPot === 1;

            if (isFromPot) {
              db.get("SELECT balance FROM pot WHERE id = 1", (err, pot) => {
                if (err) {
                  hasError = true;
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                const potBalance = Math.round(pot ? pot.balance : 0);
                if (potBalance < amountInt) {
                  hasError = true;
                  db.run("ROLLBACK", () => {});
                  return reject({ error: 'Insufficient balance in Pot' });
                }

                db.run("UPDATE pot SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [amountInt], (err) => {
                  if (err) {
                    hasError = true;
                    db.run("ROLLBACK", () => {});
                    return reject(err);
                  }

                  db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amountInt, toUserId], (err) => {
                    if (err) {
                      hasError = true;
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    db.run(
                      "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount) VALUES (?, ?, 1, 0, ?)",
                      [null, toUserId, amountInt],
                      (err) => {
                        if (err) {
                          hasError = true;
                          db.run("ROLLBACK", () => {});
                          return reject(err);
                        }

                        currentIndex++;
                        processNextTransaction();
                      }
                    );
                  });
                });
              });
            } else if (isToPot) {
              db.get("SELECT id, name, balance FROM users WHERE id = ?", [fromUserId], (err, user) => {
                if (err) {
                  hasError = true;
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                if (!user) {
                  hasError = true;
                  db.run("ROLLBACK", () => {});
                  return reject({ error: 'From user not found' });
                }

                if (user.balance < amountInt) {
                  hasError = true;
                  db.run("ROLLBACK", () => {});
                  return reject({ error: `Insufficient balance for ${user.name}` });
                }

                db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [amountInt, fromUserId], (err) => {
                  if (err) {
                    hasError = true;
                    db.run("ROLLBACK", () => {});
                    return reject(err);
                  }

                  db.run("UPDATE pot SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [amountInt], (err) => {
                    if (err) {
                      hasError = true;
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    db.run(
                      "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount) VALUES (?, ?, 0, 1, ?)",
                      [fromUserId, null, amountInt],
                      (err) => {
                        if (err) {
                          hasError = true;
                          db.run("ROLLBACK", () => {});
                          return reject(err);
                        }

                        currentIndex++;
                        processNextTransaction();
                      }
                    );
                  });
                });
              });
            } else {
              db.get("SELECT id, name, balance FROM users WHERE id = ?", [fromUserId], (err, user) => {
                if (err) {
                  hasError = true;
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                if (!user) {
                  hasError = true;
                  db.run("ROLLBACK", () => {});
                  return reject({ error: 'From user not found' });
                }

                if (user.balance < amountInt) {
                  hasError = true;
                  db.run("ROLLBACK", () => {});
                  return reject({ error: `Insufficient balance for ${user.name}` });
                }

                db.get("SELECT id FROM users WHERE id = ?", [toUserId], (err, toUser) => {
                  if (err) {
                    hasError = true;
                    db.run("ROLLBACK", () => {});
                    return reject(err);
                  }

                  if (!toUser) {
                    hasError = true;
                    db.run("ROLLBACK", () => {});
                    return reject({ error: 'To user not found' });
                  }

                  db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [amountInt, fromUserId], (err) => {
                    if (err) {
                      hasError = true;
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amountInt, toUserId], (err) => {
                      if (err) {
                        hasError = true;
                        db.run("ROLLBACK", () => {});
                        return reject(err);
                      }

                      db.run(
                        "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount) VALUES (?, ?, 0, 0, ?)",
                        [fromUserId, toUserId, amountInt],
                        (err) => {
                          if (err) {
                            hasError = true;
                            db.run("ROLLBACK", () => {});
                            return reject(err);
                          }

                          currentIndex++;
                          processNextTransaction();
                        }
                      );
                    });
                  });
                });
              });
            }
          }

          processNextTransaction();
        });
      });
    });
  },

  getTransactionHistory: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT t.id, t.amount, t.created_at, t.from_pot, t.to_pot, t.game_id, t.game_type as transaction_game_type,
                u1.name as from_user, u2.name as to_user,
                g.game_type as game_table_game_type, g.id as game_table_id
         FROM transactions t
         LEFT JOIN users u1 ON t.from_user_id = u1.id
         LEFT JOIN users u2 ON t.to_user_id = u2.id
         LEFT JOIN games g ON t.game_id = g.id
         ORDER BY t.created_at DESC
         LIMIT 50`,
        (err, rows) => {
          if (err) {
            console.error('Error fetching transaction history:', err);
            return reject(err);
          }
          
          const gameNameMap = {
            '7up7down': '7 Up & 7 Down',
            'roulette': 'Roulette',
            'rolltheball': 'Roll the Ball',
            'poker': 'Poker',
            'dealnodeal': 'Deal No Deal'
          };
          
          const formattedRows = rows.map(row => {
            let gameName = null;
            const gameType = row.transaction_game_type || row.game_table_game_type;
            if (gameType) {
              const gameTypeLower = String(gameType).toLowerCase().trim();
              gameName = gameNameMap[gameTypeLower] || gameType;
            }
            return {
              ...row,
              game_name: gameName,
              game_type: gameType
            };
          });
          
          resolve(formattedRows);
        }
      );
    });
  }
};

const familyService = {
  getFamilyRanking: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          c.id as captain_id,
          c.name as captain_name,
          c.balance as captain_balance,
          COALESCE(SUM(m.balance), 0) as members_total,
          (c.balance + COALESCE(SUM(m.balance), 0)) as family_total,
          COUNT(m.id) as member_count
        FROM users c
        LEFT JOIN users m ON m.captain_id = c.id
        WHERE c.is_captain = 1
        GROUP BY c.id, c.name, c.balance
        ORDER BY family_total DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getFamiliesUsers: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          c.id as captain_id,
          c.name as captain_name,
          c.balance as captain_balance,
          c.is_captain,
          m.id as member_id,
          m.name as member_name,
          m.balance as member_balance
        FROM users c
        LEFT JOIN users m ON m.captain_id = c.id
        WHERE c.is_captain = 1
        ORDER BY c.name, m.name`,
        (err, rows) => {
          if (err) return reject(err);
          
          const families = {};
          rows.forEach(row => {
            if (!families[row.captain_id]) {
              families[row.captain_id] = {
                captain: {
                  id: row.captain_id,
                  name: row.captain_name,
                  balance: row.captain_balance
                },
                members: []
              };
            }
            
            if (row.member_id) {
              families[row.captain_id].members.push({
                id: row.member_id,
                name: row.member_name,
                balance: row.member_balance
              });
            }
          });
          
          const result = Object.values(families).map(family => {
            const membersTotal = family.members.reduce((sum, m) => sum + m.balance, 0);
            return {
              ...family,
              familyTotal: family.captain.balance + membersTotal,
              memberCount: family.members.length
            };
          });
          
          result.sort((a, b) => b.familyTotal - a.familyTotal);
          resolve(result);
        }
      );
    });
  }
};

const gameService = {
  getAllGames: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM games ORDER BY created_at DESC", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getGameParticipants: (gameId) => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM game_participants WHERE game_id = ?", [gameId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  deleteGame: (gameId) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);

          db.run("DELETE FROM game_participants WHERE game_id = ?", [gameId], (err) => {
            if (err) {
              db.run("ROLLBACK", () => {});
              return reject(err);
            }

            db.run("DELETE FROM games WHERE id = ?", [gameId], (err) => {
              if (err) {
                db.run("ROLLBACK", () => {});
                return reject(err);
              }

              db.run("COMMIT", (commitErr) => {
                if (commitErr) {
                  db.run("ROLLBACK", () => {});
                  return reject(commitErr);
                }
                resolve({ message: 'Game deleted successfully' });
              });
            });
          });
        });
      });
    });
  },

  deleteLastRouletteGame: () => {
    return new Promise((resolve, reject) => {
      db.get("SELECT id FROM games WHERE game_type = 'roulette' ORDER BY created_at DESC LIMIT 1", (err, game) => {
        if (err) return reject(err);
        if (!game) return reject({ error: 'No roulette game found' });

        const gameId = game.id;
        db.serialize(() => {
          db.run("BEGIN TRANSACTION", (beginErr) => {
            if (beginErr) return reject(beginErr);

            db.run("DELETE FROM game_participants WHERE game_id = ?", [gameId], (err) => {
              if (err) {
                db.run("ROLLBACK", () => {});
                return reject(err);
              }

              db.run("DELETE FROM games WHERE id = ?", [gameId], (err) => {
                if (err) {
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    db.run("ROLLBACK", () => {});
                    return reject(commitErr);
                  }
                  resolve({ message: 'Last roulette game deleted successfully', gameId });
                });
              });
            });
          });
        });
      });
    });
  },

  startGame: (entryFee, participants, gameType) => {
    return new Promise((resolve, reject) => {
      const entryFeeInt = parseInt(entryFee);
      if (isNaN(entryFeeInt) || entryFeeInt <= 0) {
        return reject({ error: 'Invalid entry fee. Must be a positive number.' });
      }
      
      const userIds = participants.map(p => p.userId);
      const uniqueUserIds = [...new Set(userIds)];
      
      db.serialize(() => {
        let checkedUsers = [];
        let checkIndex = 0;
        let hasError = false;

        function checkNextUser() {
          if (hasError || checkIndex >= uniqueUserIds.length) {
            if (hasError) {
              return;
            }
            createGame();
            return;
          }

          const userId = uniqueUserIds[checkIndex];
          db.get("SELECT id, name, balance FROM users WHERE id = ?", [userId], (err, user) => {
            if (err) {
              hasError = true;
              return reject(err);
            }

            if (!user) {
              hasError = true;
              return reject({ error: `User with id ${userId} not found` });
            }

            if (user.balance < entryFeeInt) {
              hasError = true;
              return reject({ error: `Insufficient balance for ${user.name}` });
            }

            checkedUsers.push(user);
            checkIndex++;
            checkNextUser();
          });
        }

        function createGame() {
          db.run("BEGIN TRANSACTION", (beginErr) => {
            if (beginErr) return reject(beginErr);

            const totalPot = entryFeeInt * participants.length;

            db.run(
              "INSERT INTO games (game_type, entry_fee, pot_amount, status) VALUES (?, ?, ?, 'active')",
              [gameType, entryFeeInt, totalPot],
              function(err) {
                if (err) {
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                const gameId = this.lastID;
                let processedCount = 0;
                let hasProcessError = false;

                function processNextParticipant() {
                  if (hasProcessError || processedCount >= participants.length) {
                    if (hasProcessError) {
                      return;
                    }

                    db.run("COMMIT", (commitErr) => {
                      if (commitErr) {
                        db.run("ROLLBACK", () => {});
                        return reject(commitErr);
                      }

                      db.get("SELECT * FROM games WHERE id = ?", [gameId], (err, game) => {
                        if (err) return reject(err);
                        resolve({ message: 'Game started successfully', game });
                      });
                    });
                    return;
                  }

                  const participant = participants[processedCount];

                  db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [entryFeeInt, participant.userId], (err) => {
                    if (err) {
                      hasProcessError = true;
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    db.run("UPDATE pot SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [entryFeeInt], (err) => {
                      if (err) {
                        hasProcessError = true;
                        db.run("ROLLBACK", () => {});
                        return reject(err);
                      }

                      db.run(
                        "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 0, 1, ?, ?)",
                        [participant.userId, null, entryFeeInt, gameId],
                        (err) => {
                          if (err) {
                            hasProcessError = true;
                            db.run("ROLLBACK", () => {});
                            return reject(err);
                          }

                          const choiceValue = (gameType === 'roulette' || gameType === 'rolltheball' || gameType === 'poker') ? '' : (participant.choice || null);
                          
                          db.run(
                            "INSERT INTO game_participants (game_id, user_id, choice) VALUES (?, ?, ?)",
                            [gameId, participant.userId, choiceValue],
                            (err) => {
                              if (err) {
                                hasProcessError = true;
                                db.run("ROLLBACK", () => {});
                                return reject(err);
                              }

                              processedCount++;
                              processNextParticipant();
                            }
                          );
                        }
                      );
                    });
                  });
                }

                processNextParticipant();
              }
            );
          });
        }

        checkNextUser();
      });
    });
  },

  selectWinner: (gameId, winner) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);

          db.get("SELECT * FROM games WHERE id = ? AND status = 'active'", [gameId], (err, game) => {
            if (err) {
              db.run("ROLLBACK", () => {});
              return reject(err);
            }

            if (!game) {
              db.run("ROLLBACK", () => {});
              return reject({ error: 'Active game not found' });
            }

            db.all(
              "SELECT user_id FROM game_participants WHERE game_id = ? AND choice = ?",
              [gameId, winner],
              (err, winners) => {
                if (err) {
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                if (winners.length === 0) {
                  db.run("ROLLBACK", () => {});
                  return reject({ error: 'No participants selected this option' });
                }

                const amountPerWinner = Math.floor(parseInt(game.pot_amount) / winners.length);
                let processedCount = 0;
                let hasError = false;

                winners.forEach((winnerData) => {
                  db.run("UPDATE pot SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [amountPerWinner], (err) => {
                    if (err) {
                      hasError = true;
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amountPerWinner, winnerData.user_id], (err) => {
                      if (err) {
                        hasError = true;
                        db.run("ROLLBACK", () => {});
                        return reject(err);
                      }

                      db.run(
                        "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 1, 0, ?, ?)",
                        [null, winnerData.user_id, amountPerWinner, gameId],
                        (err) => {
                          if (err) {
                            hasError = true;
                            db.run("ROLLBACK", () => {});
                            return reject(err);
                          }

                          processedCount++;
                          if (processedCount === winners.length && !hasError) {
                            db.run(
                              "UPDATE games SET status = 'completed', winner = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                              [winner, gameId],
                              (err) => {
                                if (err) {
                                  db.run("ROLLBACK", () => {});
                                  return reject(err);
                                }

                                db.run("COMMIT", (commitErr) => {
                                  if (commitErr) {
                                    db.run("ROLLBACK", () => {});
                                    return reject(commitErr);
                                  }

                                  resolve({ 
                                    message: `Pot distributed successfully to ${winners.length} winner(s)`,
                                    winnersCount: winners.length,
                                    amountPerWinner: amountPerWinner
                                  });
                                });
                              }
                            );
                          }
                        }
                      );
                    });
                  });
                });
              }
            );
          });
        });
      });
    });
  },

  saveRouletteNumbers: (gameId, participantNumbers) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);

          db.get("SELECT round_number FROM games WHERE id = ?", [gameId], (err, game) => {
            if (err) {
              db.run("ROLLBACK", () => {});
              return reject(err);
            }

            const roundNumber = game ? game.round_number : 1;
            let processedCount = 0;
            let hasError = false;

            participantNumbers.forEach((pn) => {
              db.run(
                "INSERT OR REPLACE INTO game_participants (game_id, user_id, choice, number, round_number) VALUES (?, ?, ?, ?, ?)",
                [gameId, pn.userId, '', pn.number, roundNumber],
                (err) => {
                  if (err) {
                    if (!hasError) {
                      hasError = true;
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }
                    return;
                  }

                  processedCount++;
                  if (processedCount === participantNumbers.length && !hasError) {
                    db.run("COMMIT", (commitErr) => {
                      if (commitErr) {
                        db.run("ROLLBACK", () => {});
                        return reject(commitErr);
                      }
                      resolve({ message: 'Numbers saved successfully' });
                    });
                  }
                }
              );
            });
          });
        });
      });
    });
  },

  spinRoulette: (gameId, manualResult) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.get("SELECT round_number, pot_amount FROM games WHERE id = ?", [gameId], (err, game) => {
          if (err) return reject(err);
          if (!game) return reject({ error: 'Game not found' });

          const roundNumber = game.round_number || 1;

          db.all(
            "SELECT user_id FROM game_participants WHERE game_id = ? AND round_number = ?",
            [gameId, roundNumber],
            (err, participants) => {
              if (err) return reject(err);

              if (participants.length === 1) {
                const winnerUserId = participants[0].user_id;
                const potAmount = Math.round(parseInt(game.pot_amount || 0));

                db.run("BEGIN TRANSACTION", (beginErr) => {
                  if (beginErr) return reject(beginErr);

                  db.run("UPDATE pot SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [potAmount], (err) => {
                    if (err) {
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [potAmount, winnerUserId], (err) => {
                      if (err) {
                        db.run("ROLLBACK", () => {});
                        return reject(err);
                      }

                      db.run(
                        "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 1, 0, ?, ?)",
                        [null, winnerUserId, potAmount, gameId],
                        (err) => {
                          if (err) {
                            db.run("ROLLBACK", () => {});
                            return reject(err);
                          }

                          db.run(
                            "UPDATE games SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                            [gameId],
                            (err) => {
                              if (err) {
                                db.run("ROLLBACK", () => {});
                                return reject(err);
                              }

                              db.run("COMMIT", (commitErr) => {
                                if (commitErr) {
                                  db.run("ROLLBACK", () => {});
                                  return reject(commitErr);
                                }

                                resolve({ 
                                  autoWinner: true,
                                  winnerUserId: winnerUserId,
                                  potAmount: potAmount,
                                  message: 'Only one participant remaining - automatically declared as winner!'
                                });
                              });
                            }
                          );
                        }
                      );
                    });
                  });
                });
                return;
              }

              const spinResult = manualResult !== undefined ? parseInt(manualResult) : Math.floor(Math.random() * 37);

              if (isNaN(spinResult) || spinResult < 0 || spinResult > 36) {
                return reject({ error: 'Spin result must be between 0 and 36' });
              }

              db.run(
                "UPDATE games SET spin_result = ? WHERE id = ?",
                [spinResult, gameId],
                (err) => {
                  if (err) return reject(err);
                  resolve({ spinResult });
                }
              );
            }
          );
        });
      });
    });
  },

  getRouletteWinners: (gameId) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT spin_result, round_number FROM games WHERE id = ?", [gameId], (err, game) => {
        if (err) return reject(err);
        if (!game || game.spin_result === null) {
          return reject({ error: 'Game has not been spun yet' });
        }

        db.all(
          "SELECT user_id, number FROM game_participants WHERE game_id = ? AND number = ? AND round_number = ?",
          [gameId, game.spin_result, game.round_number],
          (err, winners) => {
            if (err) return reject(err);
            resolve({ winners, spinResult: game.spin_result });
          }
        );
      });
    });
  },

  declareNearestWinner: (gameId) => {
    const wheelOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const totalSlots = wheelOrder.length;
    const getWheelPosition = (number) => {
      return wheelOrder.indexOf(number);
    };
    const getWheelDistance = (spinResult, participantNumber) => {
      const spinPos = getWheelPosition(spinResult);
      const participantPos = getWheelPosition(participantNumber);
      if (spinPos === -1 || participantPos === -1) {
        return Math.abs(spinResult - participantNumber);
      }
      const diff = Math.abs(participantPos - spinPos);
      const forwardDistance = diff;
      const backwardDistance = totalSlots - diff;
      return Math.min(forwardDistance, backwardDistance);
    };

    return new Promise((resolve, reject) => {
      db.get("SELECT spin_result, round_number FROM games WHERE id = ?", [gameId], (err, game) => {
        if (err) return reject(err);
        if (!game || game.spin_result === null) {
          return reject({ error: 'Game has not been spun yet' });
        }

        db.all(
          "SELECT user_id, number FROM game_participants WHERE game_id = ? AND round_number = ?",
          [gameId, game.round_number],
          (err, participants) => {
            if (err) return reject(err);
            if (participants.length === 0) {
              return reject({ error: 'No participants found' });
            }

            let minDistance = Infinity;
            const nearestWinners = [];
            participants.forEach((p) => {
              const distance = getWheelDistance(game.spin_result, p.number);
              if (distance < minDistance) {
                minDistance = distance;
                nearestWinners.length = 0;
                nearestWinners.push(p);
              } else if (distance === minDistance) {
                nearestWinners.push(p);
              }
            });
            resolve({ winners: nearestWinners, spinResult: game.spin_result, distance: minDistance });
          }
        );
      });
    });
  },

  distributeRoulettePot: (gameId, winnerUserIds) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);

          db.get("SELECT pot_amount FROM games WHERE id = ?", [gameId], (err, game) => {
            if (err) {
              db.run("ROLLBACK", () => {});
              return reject(err);
            }

            if (!game) {
              db.run("ROLLBACK", () => {});
              return reject({ error: 'Game not found' });
            }

            const amountPerWinner = Math.floor(parseInt(game.pot_amount) / winnerUserIds.length);
            let processedCount = 0;
            let hasError = false;

            winnerUserIds.forEach((userId) => {
              db.run("UPDATE pot SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [amountPerWinner], (err) => {
                if (err) {
                  hasError = true;
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amountPerWinner, userId], (err) => {
                  if (err) {
                    hasError = true;
                    db.run("ROLLBACK", () => {});
                    return reject(err);
                  }

                  db.run(
                    "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 1, 0, ?, ?)",
                    [null, userId, amountPerWinner, gameId],
                    (err) => {
                      if (err) {
                        hasError = true;
                        db.run("ROLLBACK", () => {});
                        return reject(err);
                      }

                      processedCount++;
                      if (processedCount === winnerUserIds.length && !hasError) {
                        db.run("UPDATE games SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?", [gameId], (err) => {
                          if (err) {
                            db.run("ROLLBACK", () => {});
                            return reject(err);
                          }

                          db.run("COMMIT", (commitErr) => {
                            if (commitErr) {
                              db.run("ROLLBACK", () => {});
                              return reject(commitErr);
                            }
                            resolve({ message: 'Pot distributed successfully', amountPerWinner });
                          });
                        });
                      }
                    }
                  );
                });
              });
            });
          });
        });
      });
    });
  },

  startNextRound: (gameId, additionalBet, participantIds) => {
    return new Promise((resolve, reject) => {
      if (participantIds.length === 1) {
        const winnerUserId = participantIds[0];
        
        db.serialize(() => {
          db.run("BEGIN TRANSACTION", (beginErr) => {
            if (beginErr) return reject(beginErr);

            db.get("SELECT id, name, balance FROM users WHERE id = ?", [winnerUserId], (err, user) => {
              if (err) {
                db.run("ROLLBACK", () => {});
                return reject(err);
              }

              if (!user) {
                db.run("ROLLBACK", () => {});
                return reject({ error: `User with id ${winnerUserId} not found` });
              }

              if (user.balance < additionalBet) {
                db.run("ROLLBACK", () => {});
                return reject({ error: `Insufficient balance for ${user.name}` });
              }

              db.get("SELECT pot_amount FROM games WHERE id = ?", [gameId], (err, game) => {
                if (err) {
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                if (!game) {
                  db.run("ROLLBACK", () => {});
                  return reject({ error: 'Game not found' });
                }

                const totalPotAmount = Math.round(parseInt(game.pot_amount || 0)) + parseInt(additionalBet);

                db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [additionalBet, winnerUserId], (err) => {
                  if (err) {
                    db.run("ROLLBACK", () => {});
                    return reject(err);
                  }

                  db.run("UPDATE pot SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [additionalBet], (err) => {
                    if (err) {
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    db.run(
                      "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 0, 1, ?, ?)",
                      [winnerUserId, null, additionalBet, gameId],
                      (err) => {
                        if (err) {
                          db.run("ROLLBACK", () => {});
                          return reject(err);
                        }

                        db.run("UPDATE pot SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [totalPotAmount], (err) => {
                          if (err) {
                            db.run("ROLLBACK", () => {});
                            return reject(err);
                          }

                          db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [totalPotAmount, winnerUserId], (err) => {
                            if (err) {
                              db.run("ROLLBACK", () => {});
                              return reject(err);
                            }

                            db.run(
                              "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 1, 0, ?, ?)",
                              [null, winnerUserId, totalPotAmount, gameId],
                              (err) => {
                                if (err) {
                                  db.run("ROLLBACK", () => {});
                                  return reject(err);
                                }

                                db.run(
                                  "UPDATE games SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                                  [gameId],
                                  (err) => {
                                    if (err) {
                                      db.run("ROLLBACK", () => {});
                                      return reject(err);
                                    }

                                    db.run("COMMIT", (commitErr) => {
                                      if (commitErr) {
                                        db.run("ROLLBACK", () => {});
                                        return reject(commitErr);
                                      }

                                      resolve({ 
                                        autoWinner: true,
                                        winnerUserId: winnerUserId,
                                        potAmount: totalPotAmount,
                                        message: 'Only one participant selected - automatically declared as winner!'
                                      });
                                    });
                                  }
                                );
                              }
                            );
                          });
                        });
                      }
                    );
                  });
                });
              });
            });
          });
        });
        return;
      }

      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);

          let checkedCount = 0;
          let hasError = false;

          participantIds.forEach((userId) => {
            db.get("SELECT id, name, balance FROM users WHERE id = ?", [userId], (err, user) => {
              checkedCount++;
              if (err) {
                hasError = true;
                db.run("ROLLBACK", () => {});
                return reject(err);
              }

              if (!user) {
                hasError = true;
                db.run("ROLLBACK", () => {});
                return reject({ error: `User with id ${userId} not found` });
              }

              if (user.balance < additionalBet) {
                hasError = true;
                db.run("ROLLBACK", () => {});
                return reject({ error: `Insufficient balance for ${user.name}` });
              }

              if (checkedCount === participantIds.length && !hasError) {
                db.get("SELECT round_number, pot_amount, status FROM games WHERE id = ?", [gameId], (err, game) => {
                  if (err) {
                    db.run("ROLLBACK", () => {});
                    return reject(err);
                  }

                  if (!game) {
                    db.run("ROLLBACK", () => {});
                    return reject({ error: 'Game not found' });
                  }

                  if (game.status === 'completed') {
                    db.run("ROLLBACK", () => {});
                    return reject({ error: 'Cannot start next round for a completed game' });
                  }

                  const newRoundNumber = (game.round_number || 1) + 1;
                  const totalAdditionalBet = parseInt(additionalBet) * participantIds.length;
                  const newPotAmount = Math.round(parseInt(game.pot_amount || 0)) + totalAdditionalBet;

                  db.run(
                    "UPDATE games SET round_number = ?, pot_amount = ?, spin_result = NULL WHERE id = ?",
                    [newRoundNumber, newPotAmount, gameId],
                    (err) => {
                      if (err) {
                        db.run("ROLLBACK", () => {});
                        return reject(err);
                      }

                      let processedCount = 0;
                      participantIds.forEach((userId) => {
                        db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [additionalBet, userId], (err) => {
                          if (err) {
                            hasError = true;
                            db.run("ROLLBACK", () => {});
                            return reject(err);
                          }

                          db.run("UPDATE pot SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [additionalBet], (err) => {
                            if (err) {
                              hasError = true;
                              db.run("ROLLBACK", () => {});
                              return reject(err);
                            }

                            db.run(
                              "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 0, 1, ?, ?)",
                              [userId, null, additionalBet, gameId],
                              (err) => {
                                if (err) {
                                  hasError = true;
                                  db.run("ROLLBACK", () => {});
                                  return reject(err);
                                }

                                processedCount++;
                                if (processedCount === participantIds.length && !hasError) {
                                  db.run("COMMIT", (commitErr) => {
                                    if (commitErr) {
                                      db.run("ROLLBACK", () => {});
                                      return reject(commitErr);
                                    }
                                    resolve({ message: 'Next round started successfully', roundNumber: newRoundNumber, newPotAmount });
                                  });
                                }
                              }
                            );
                          });
                        });
                      });
                    }
                  );
                });
              }
            });
          });
        });
      });
    });
  },

  selectRollTheBallWinner: (gameId, winnerUserId) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);

          db.get("SELECT pot_amount, status FROM games WHERE id = ?", [gameId], (err, game) => {
            if (err) {
              db.run("ROLLBACK", () => {});
              return reject(err);
            }

            if (!game) {
              db.run("ROLLBACK", () => {});
              return reject({ error: 'Game not found' });
            }

            if (game.status === 'completed') {
              db.run("ROLLBACK", () => {});
              return reject({ error: 'Game is already completed' });
            }

            db.get(
              "SELECT user_id FROM game_participants WHERE game_id = ? AND user_id = ?",
              [gameId, winnerUserId],
              (err, participant) => {
                if (err) {
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                if (!participant) {
                  db.run("ROLLBACK", () => {});
                  return reject({ error: 'Selected winner is not a participant in this game' });
                }

                const potAmount = Math.round(parseInt(game.pot_amount || 0));

                db.run("UPDATE pot SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [potAmount], (err) => {
                  if (err) {
                    db.run("ROLLBACK", () => {});
                    return reject(err);
                  }

                  db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [potAmount, winnerUserId], (err) => {
                    if (err) {
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    db.run(
                      "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 1, 0, ?, ?)",
                      [null, winnerUserId, potAmount, gameId],
                      (err) => {
                        if (err) {
                          db.run("ROLLBACK", () => {});
                          return reject(err);
                        }

                        db.run(
                          "UPDATE games SET status = 'completed', winner = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                          [winnerUserId.toString(), gameId],
                          (err) => {
                            if (err) {
                              db.run("ROLLBACK", () => {});
                              return reject(err);
                            }

                            db.run("COMMIT", (commitErr) => {
                              if (commitErr) {
                                db.run("ROLLBACK", () => {});
                                return reject(commitErr);
                              }

                              resolve({ 
                                message: 'Winner selected and pot distributed successfully',
                                winnerUserId: winnerUserId,
                                potAmount: potAmount
                              });
                            });
                          }
                        );
                      }
                    );
                  });
                });
              }
            );
          });
        });
      });
    });
  },

  distributePokerPot: (gameId, distribution) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);

          db.get("SELECT pot_amount, status FROM games WHERE id = ?", [gameId], (err, game) => {
            if (err) {
              db.run("ROLLBACK", () => {});
              return reject(err);
            }

            if (!game) {
              db.run("ROLLBACK", () => {});
              return reject({ error: 'Game not found' });
            }

            if (game.status === 'completed') {
              db.run("ROLLBACK", () => {});
              return reject({ error: 'Game is already completed' });
            }

            const potAmount = parseInt(game.pot_amount || 0);
            const totalDistributed = distribution.reduce((sum, d) => sum + (parseInt(d.amount) || 0), 0);
            
            if (totalDistributed !== potAmount) {
              db.run("ROLLBACK", () => {});
              return reject({ 
                error: `Total distribution amount (${totalDistributed}) must equal pot amount (${potAmount})` 
              });
            }

            const winnerData = distribution.reduce((max, curr) => 
              (parseInt(curr.amount) || 0) > (parseInt(max.amount) || 0) ? curr : max
            );

            const userIds = distribution.map(d => d.userId);
            db.all(
              "SELECT user_id FROM game_participants WHERE game_id = ? AND user_id IN (" + userIds.map(() => '?').join(',') + ")",
              [gameId, ...userIds],
              (err, participants) => {
                if (err) {
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                if (participants.length !== userIds.length) {
                  db.run("ROLLBACK", () => {});
                  return reject({ error: 'Some participants are not in this game' });
                }

                const validDistributions = distribution.filter(d => (parseInt(d.amount) || 0) > 0);
                let processedCount = 0;
                let hasError = false;

                function processNextDistribution() {
                  if (hasError) {
                    return;
                  }

                  if (processedCount >= validDistributions.length) {
                    db.run(
                      "UPDATE games SET status = 'completed', winner = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                      [winnerData.userId.toString(), gameId],
                      (err) => {
                        if (err) {
                          db.run("ROLLBACK", () => {});
                          return reject(err);
                        }

                        db.run("COMMIT", (commitErr) => {
                          if (commitErr) {
                            db.run("ROLLBACK", () => {});
                            return reject(commitErr);
                          }

                          resolve({ 
                            message: 'Pot distributed successfully',
                            winnerUserId: winnerData.userId,
                            distribution: distribution
                          });
                        });
                      }
                    );
                    return;
                  }

                  const dist = validDistributions[processedCount];
                  const amount = parseInt(dist.amount) || 0;

                  db.run("UPDATE pot SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [amount], (err) => {
                    if (err) {
                      hasError = true;
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, dist.userId], (err) => {
                      if (err) {
                        hasError = true;
                        db.run("ROLLBACK", () => {});
                        return reject(err);
                      }

                      db.run(
                        "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 1, 0, ?, ?)",
                        [null, dist.userId, amount, gameId],
                        (err) => {
                          if (err) {
                            hasError = true;
                            db.run("ROLLBACK", () => {});
                            return reject(err);
                          }

                          processedCount++;
                          processNextDistribution();
                        }
                      );
                    });
                  });
                }

                processNextDistribution();
              }
            );
          });
        });
      });
    });
  }
};

const adminService = {
  flushDatabase: () => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Disable foreign key constraints temporarily
        db.run("PRAGMA foreign_keys = OFF", (pragmaErr) => {
          if (pragmaErr) return reject(pragmaErr);

          db.run("BEGIN TRANSACTION", (beginErr) => {
            if (beginErr) {
              db.run("PRAGMA foreign_keys = ON", () => {});
              return reject(beginErr);
            }

            // Delete all data from all tables in correct order
            db.run("DELETE FROM game_participants", (err) => {
              if (err) {
                db.run("ROLLBACK", () => {
                  db.run("PRAGMA foreign_keys = ON", () => {});
                });
                return reject(err);
              }

              db.run("DELETE FROM games", (err) => {
                if (err) {
                  db.run("ROLLBACK", () => {
                    db.run("PRAGMA foreign_keys = ON", () => {});
                  });
                  return reject(err);
                }

                db.run("DELETE FROM transactions", (err) => {
                  if (err) {
                    db.run("ROLLBACK", () => {
                      db.run("PRAGMA foreign_keys = ON", () => {});
                    });
                    return reject(err);
                  }

                  db.run("DELETE FROM users", (err) => {
                    if (err) {
                      db.run("ROLLBACK", () => {
                        db.run("PRAGMA foreign_keys = ON", () => {});
                      });
                      return reject(err);
                    }

                    db.run("DELETE FROM pot", (err) => {
                      if (err) {
                        db.run("ROLLBACK", () => {
                          db.run("PRAGMA foreign_keys = ON", () => {});
                        });
                        return reject(err);
                      }

                      // Reset pot to initial state
                      db.run("INSERT INTO pot (id, balance) VALUES (1, 0)", (err) => {
                        if (err) {
                          db.run("ROLLBACK", () => {
                            db.run("PRAGMA foreign_keys = ON", () => {});
                          });
                          return reject(err);
                        }

                        db.run("COMMIT", (commitErr) => {
                          if (commitErr) {
                            db.run("ROLLBACK", () => {
                              db.run("PRAGMA foreign_keys = ON", () => {});
                            });
                            return reject(commitErr);
                          }

                          // Re-enable foreign keys
                          db.run("PRAGMA foreign_keys = ON", (pragmaErr) => {
                            if (pragmaErr) {
                              console.error("Error re-enabling foreign keys:", pragmaErr);
                            }
                            resolve({ message: 'Database flushed successfully' });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }
};

module.exports = {
  userService,
  potService,
  transactionService,
  familyService,
  gameService,
  adminService
};

