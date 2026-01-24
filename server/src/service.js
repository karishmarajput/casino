const { db } = require('./db');
const bcrypt = require('bcrypt');

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
      
      const errors = [];
      let completed = 0;
      const total = names.filter(name => name.trim()).length;

      if (total === 0) {
        return reject({ error: 'No valid names provided' });
      }

      names.forEach((name) => {
        if (name.trim()) {
          const trimmedName = name.trim();
          const plainPassword = generatePassword(trimmedName);
          const hashedPassword = bcrypt.hashSync(plainPassword, 10);
          
          db.run("INSERT INTO users (name, balance, is_captain, password) VALUES (?, ?, 1, ?)", 
            [trimmedName, amountInt, hashedPassword], 
            function(err) {
              completed++;
              
              if (err && (err.message && err.message.includes('UNIQUE') || err.code === '23505')) {
                errors.push(`Captain "${name}" already exists`);
              } else if (err) {
                errors.push(`Error creating captain "${name}": ${err.message || err}`);
              }

              // Check if all operations are complete
              if (completed === total) {
                if (errors.length > 0) {
                  return reject({ errors });
                }
                
                resolve({ message: 'Captains registered successfully' });
              }
            }
          );
        }
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

        const errors = [];
        let completed = 0;
        const total = names.filter(name => name.trim()).length;

        if (total === 0) {
          return reject({ error: 'No valid names provided' });
        }

        names.forEach((name) => {
          if (name.trim()) {
            const trimmedName = name.trim();
            const plainPassword = generatePassword(trimmedName);
            const hashedPassword = bcrypt.hashSync(plainPassword, 10);
            
            db.run("INSERT INTO users (name, balance, is_captain, captain_id, password) VALUES (?, ?, 0, ?, ?)", 
              [trimmedName, amountInt, captainId, hashedPassword], 
              function(err) {
                completed++;
                
                if (err && (err.message && err.message.includes('UNIQUE') || err.code === '23505')) {
                  errors.push(`User "${name}" already exists`);
                } else if (err) {
                  errors.push(`Error creating user "${name}": ${err.message || err}`);
                }

                // Check if all operations are complete
                if (completed === total) {
                  if (errors.length > 0) {
                    return reject({ errors });
                  }
                  
                  resolve({ message: 'Family members registered successfully' });
                }
              }
            );
          }
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
        
        if (bcrypt.compareSync(password, user.password)) {
          resolve({ id: user.id, name: user.name, balance: user.balance });
        } else {
          reject({ error: 'Invalid credentials' });
        }
      });
    });
  },

  loginByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT id, name, balance FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) return reject(err);
        if (!user) {
          return reject({ error: 'User not found' });
        }
        resolve({ id: user.id, name: user.name, balance: user.balance });
      });
    });
  },

  getUserById: (userId) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT id, name, balance, is_captain, captain_id FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) return reject(err);
        if (!user) return reject({ error: 'User not found' });
        resolve(user);
      });
    });
  },

  getUserFamilyBalance: (userId) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT id, name, balance, is_captain, captain_id FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) return reject(err);
        if (!user) return reject({ error: 'User not found' });

        let captainId;
        
        if (user.is_captain === 1) {
          captainId = user.id;
        } else if (user.captain_id) {
          captainId = user.captain_id;
        } else {
          return resolve({ familyTotal: Math.round(user.balance || 0) });
        }

        db.all(
          `SELECT 
            c.balance as captain_balance,
            COALESCE(SUM(m.balance), 0) as members_total
          FROM users c
          LEFT JOIN users m ON m.captain_id = c.id
          WHERE c.id = ?
          GROUP BY c.id, c.balance`,
          [captainId],
          (err, rows) => {
            if (err) return reject(err);
            if (rows.length === 0) {
              return resolve({ familyTotal: 0 });
            }
            
            const row = rows[0];
            const captainBalance = Math.round(row.captain_balance || 0);
            const membersTotal = Math.round(row.members_total || 0);
            const familyTotal = captainBalance + membersTotal;
            
            resolve({ familyTotal });
          }
        );
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
            'dealnodeal': 'Steal No Steal'
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
      // Get games where user is in game_participants OR has transactions for the game
      db.all(
        `SELECT DISTINCT g.*, 
         COALESCE(u1.name, u2.name, g.winner) as winner_name,
         COALESCE(
           (
             SELECT array_agg(DISTINCT u.name ORDER BY u.name)
             FROM game_participants gp2
             INNER JOIN users u ON gp2.user_id = u.id
             WHERE gp2.game_id = g.id
           ),
           ARRAY[]::text[]
         ) as participant_names
         FROM games g
         LEFT JOIN users u1 ON g.winner = u1.id::text
         LEFT JOIN users u2 ON g.winner = u2.name
         WHERE g.id IN (
           SELECT DISTINCT game_id 
           FROM game_participants 
           WHERE user_id = ? AND game_id IS NOT NULL
           UNION
           SELECT DISTINCT game_id 
           FROM transactions 
           WHERE (from_user_id = ? OR to_user_id = ?) AND game_id IS NOT NULL
         )
         ORDER BY g.created_at DESC
         LIMIT 50`,
        [userId, userId, userId],
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
            'dealnodeal': 'Steal No Steal'
          };
          
          const formattedRows = rows.map(row => {
            const gameType = String(row.game_type).toLowerCase().trim();
            // Parse participant_names array (PostgreSQL returns it as a string like "{name1,name2}" or as an array)
            let participantNames = [];
            if (row.participant_names) {
              if (Array.isArray(row.participant_names)) {
                participantNames = row.participant_names;
              } else if (typeof row.participant_names === 'string') {
                // Remove curly braces and split by comma
                const namesStr = row.participant_names.replace(/[{}]/g, '');
                participantNames = namesStr ? namesStr.split(',').map(name => name.trim()).filter(name => name) : [];
              }
            }
            
            return {
              ...row,
              game_name: gameNameMap[gameType] || row.game_type,
              winner_name: row.winner_name || null,
              participant_names: participantNames
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
            'dealnodeal': 'Steal No Steal'
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
            const membersTotal = family.members.reduce((sum, m) => {
              const balance = parseFloat(m.balance) || 0;
              return sum + balance;
            }, 0);
            const captainBalance = parseFloat(family.captain.balance) || 0;
            return {
              ...family,
              captain: {
                ...family.captain,
                balance: captainBalance
              },
              members: family.members.map(m => ({
                ...m,
                balance: parseFloat(m.balance) || 0
              })),
              familyTotal: captainBalance + membersTotal,
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

  startGame: async (entryFee, participants, gameType) => {
    const { pool } = require('./db');
    
    const entryFeeInt = parseInt(entryFee);
    if (isNaN(entryFeeInt) || entryFeeInt <= 0) {
      throw { error: 'Invalid entry fee. Must be a positive number.' };
    }
    
    const userIds = participants.map(p => p.userId);
    const uniqueUserIds = [...new Set(userIds)];
    
    // First, check users exist and have sufficient balance (outside transaction)
    const placeholders = uniqueUserIds.map((_, i) => `$${i + 1}`).join(',');
    const userCheckResult = await pool.query(
      `SELECT id, name, balance FROM users WHERE id IN (${placeholders})`,
      uniqueUserIds
    );
    
    if (userCheckResult.rows.length !== uniqueUserIds.length) {
      const foundIds = userCheckResult.rows.map(u => u.id);
      const missingId = uniqueUserIds.find(id => !foundIds.includes(parseInt(id)));
      throw { error: `User with id ${missingId} not found` };
    }
    
    const insufficientBalance = userCheckResult.rows.find(u => parseFloat(u.balance) < entryFeeInt);
    if (insufficientBalance) {
      throw { error: `Insufficient balance for ${insufficientBalance.name}` };
    }
    
    // Now start transaction with a single client
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const totalPot = entryFeeInt * participants.length;
      
      // Insert game
      const gameResult = await client.query(
        "INSERT INTO games (game_type, entry_fee, pot_amount, status) VALUES ($1, $2, $3, 'active') RETURNING id",
        [gameType, entryFeeInt, totalPot]
      );
      
      const gameId = gameResult.rows[0].id;
      
      if (!gameId) {
        await client.query('ROLLBACK');
        client.release();
        throw { error: 'Failed to get game ID after creation' };
      }
      
      // Update user balances
      const balancePlaceholders = uniqueUserIds.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(
        `UPDATE users SET balance = balance - $${uniqueUserIds.length + 1} WHERE id IN (${balancePlaceholders})`,
        [...uniqueUserIds, entryFeeInt]
      );
      
      // Update pot
      await client.query(
        'UPDATE pot SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [totalPot]
      );
      
      // Insert transactions
      const transactionValues = participants.map((_, i) => {
        const base = i * 6;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
      }).join(', ');
      
      const transactionParams = participants.flatMap(p => [
        p.userId, null, 0, 1, entryFeeInt, gameId
      ]);
      
      await client.query(
        `INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES ${transactionValues}`,
        transactionParams
      );
      
      // Insert game participants
      const choiceValue = (gameType === 'roulette' || gameType === 'rolltheball' || gameType === 'poker') ? '' : null;
      const roundNumber = 1;
      
      const participantValues = participants.map((_, i) => {
        const base = i * 4;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      }).join(', ');
      
      const participantParams = participants.flatMap(p => {
        const participantChoice = choiceValue !== null ? choiceValue : (p.choice || null);
        return [gameId, p.userId, participantChoice, roundNumber];
      });
      
      await client.query(
        `INSERT INTO game_participants (game_id, user_id, choice, round_number) VALUES ${participantValues} ON CONFLICT (game_id, user_id, round_number) DO UPDATE SET choice = EXCLUDED.choice`,
        participantParams
      );
      
      await client.query('COMMIT');
      client.release();
      
      const game = {
        id: gameId,
        game_type: gameType,
        entry_fee: entryFeeInt,
        pot_amount: totalPot,
        status: 'active',
        winner: null,
        spin_result: null,
        round_number: 1,
        created_at: new Date().toISOString(),
        completed_at: null
      };
      
      return { message: 'Game started successfully', game };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      throw error;
    }
  },

  selectWinner: (gameId, winner) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);
          db.get("SELECT * FROM games WHERE id = ?", [gameId], (err, game) => {
            if (err) {
              db.run("ROLLBACK", () => {});
              return reject(err);
            }

            if (!game) {
              db.run("ROLLBACK", () => {});
              return reject({ error: 'Game not found' });
            }

            if (game.status !== 'active') {
              db.run("ROLLBACK", () => {});
              return reject({ error: `Game is not active. Current status: ${game.status}` });
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

                const amountPerWinner = Math.round(parseFloat(game.pot_amount) / winners.length * 100) / 100;
                let processedCount = 0;
                let hasError = false;
                const winnerUserIds = winners.map(w => w.user_id);

                const placeholders = winnerUserIds.map(() => '?').join(',');
                db.all(
                  `SELECT name FROM users WHERE id IN (${placeholders})`,
                  winnerUserIds,
                  (err, winnerUsers) => {
                    if (err) {
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    const winnerNames = winnerUsers.map(u => u.name).join(', ');

                    function processNextWinner() {
                      if (hasError) {
                        return;
                      }

                      if (processedCount >= winners.length) {
                        db.run(
                          "UPDATE games SET status = 'completed', winner = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                          [winnerNames, gameId],
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
                        return;
                      }

                  const winnerData = winners[processedCount];
                  const amount = Math.round(amountPerWinner * 100) / 100;

                  db.run("UPDATE pot SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [amount], (err) => {
                    if (err) {
                      hasError = true;
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, winnerData.user_id], (err) => {
                      if (err) {
                        hasError = true;
                        db.run("ROLLBACK", () => {});
                        return reject(err);
                      }

                      db.run(
                        "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 1, 0, ?, ?)",
                        [null, winnerData.user_id, amount, gameId],
                        (err) => {
                          if (err) {
                            hasError = true;
                            db.run("ROLLBACK", () => {});
                            return reject(err);
                          }

                          processedCount++;
                          processNextWinner();
                        }
                      );
                    });
                  });
                    }

                    processNextWinner();
                  }
                );
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

            function processNextParticipant() {
              if (hasError) {
                return;
              }

              if (processedCount >= participantNumbers.length) {
                db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    db.run("ROLLBACK", () => {});
                    return reject(commitErr);
                  }
                  console.log(`Successfully saved ${processedCount} participant numbers for gameId=${gameId}, roundNumber=${roundNumber}`);
                  resolve({ message: 'Numbers saved successfully' });
                });
                return;
              }

              const pn = participantNumbers[processedCount];
              console.log(`Saving participant: userId=${pn.userId}, number=${pn.number}, roundNumber=${roundNumber}`);
              
              db.run(
                "INSERT INTO game_participants (game_id, user_id, choice, number, round_number) VALUES (?, ?, ?, ?, ?) ON CONFLICT (game_id, user_id, round_number) DO UPDATE SET choice = EXCLUDED.choice, number = EXCLUDED.number",
                [gameId, pn.userId, '', pn.number, roundNumber],
                (err) => {
                  if (err) {
                    console.error(`Error saving participant userId=${pn.userId}, number=${pn.number}:`, err);
                    hasError = true;
                    db.run("ROLLBACK", () => {});
                    return reject(err);
                  }

                  processedCount++;
                  processNextParticipant();
                }
              );
            }

            processNextParticipant();
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

        const spinResultInt = parseInt(game.spin_result);
        
        db.all(
          "SELECT user_id, number, round_number FROM game_participants WHERE game_id = ? ORDER BY round_number, user_id",
          [gameId],
          (err, allParticipants) => {
            if (err) {
              console.error('Error fetching all participants:', err);
              return reject(err);
            }
            console.log(`Debug - ALL participants for gameId=${gameId} (all rounds):`, JSON.stringify(allParticipants, null, 2));
            
            const participantsWithNumbers = allParticipants.filter(p => p.number !== null && p.number !== undefined);
            console.log(`Debug - Participants WITH numbers:`, JSON.stringify(participantsWithNumbers, null, 2));
            console.log(`Debug - Looking for spinResult=${spinResultInt}`);
            
            db.all(
              "SELECT user_id, number, round_number FROM game_participants WHERE game_id = ? AND number IS NOT NULL AND CAST(number AS INTEGER) = ?",
              [gameId, spinResultInt],
              (err, winners) => {
                if (err) {
                  console.error('Error fetching roulette winners:', err);
                  return reject(err);
                }
                console.log(`Roulette winners query: gameId=${gameId}, spinResult=${spinResultInt}, winners found:`, winners.length, winners);
                
                if (winners.length === 0) {
                  console.log('WARNING: No winners found. Checking if number 5 exists in any round...');
                  const number5Participants = allParticipants.filter(p => p.number !== null && parseInt(p.number) === 5);
                  console.log(`Participants with number 5:`, JSON.stringify(number5Participants, null, 2));
                }
                
                const uniqueWinners = [];
                const seenUserIds = new Set();
                winners.forEach(winner => {
                  if (!seenUserIds.has(winner.user_id)) {
                    seenUserIds.add(winner.user_id);
                    uniqueWinners.push(winner);
                  }
                });
                
                console.log(`Deduplicated winners: ${uniqueWinners.length} unique winners from ${winners.length} total entries`);
                
                resolve({ winners: uniqueWinners, spinResult: game.spin_result });
              }
            );
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

            const totalWins = winnerUserIds.length;
            const amountPerWin = parseFloat(game.pot_amount) / totalWins;
            const winCounts = {};
            winnerUserIds.forEach(userId => {
              winCounts[userId] = (winCounts[userId] || 0) + 1;
            });
            
            const uniqueWinnerUserIds = [...new Set(winnerUserIds)];
            let processedCount = 0;
            let hasError = false;

            // Get winner names (using unique IDs only to avoid duplicate names)
            const placeholders = uniqueWinnerUserIds.map(() => '?').join(',');
            db.all(
              `SELECT name FROM users WHERE id IN (${placeholders})`,
              uniqueWinnerUserIds,
              (err, winnerUsers) => {
                if (err) {
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                const winnerNames = winnerUsers.map(u => u.name).join(', ');

                // Process each unique winner with their total winnings
                uniqueWinnerUserIds.forEach((userId) => {
                  const userWinCount = winCounts[userId];
                  const userTotalAmount = amountPerWin * userWinCount;
                  
                  db.run("UPDATE pot SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [userTotalAmount], (err) => {
                if (err) {
                  hasError = true;
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                    db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [userTotalAmount, userId], (err) => {
                      if (err) {
                        hasError = true;
                        db.run("ROLLBACK", () => {});
                        return reject(err);
                      }

                      db.run(
                        "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 1, 0, ?, ?)",
                        [null, userId, userTotalAmount, gameId],
                        (err) => {
                          if (err) {
                            hasError = true;
                            db.run("ROLLBACK", () => {});
                            return reject(err);
                          }

                          processedCount++;
                          if (processedCount === uniqueWinnerUserIds.length && !hasError) {
                            db.run("UPDATE games SET status = 'completed', winner = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?", [winnerNames, gameId], (err) => {
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
                                  amountPerWin: amountPerWin,
                                  totalWins: totalWins,
                                  uniqueWinners: uniqueWinnerUserIds.length
                                });
                              });
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

      db.run("BEGIN", (beginErr) => {
        if (beginErr) return reject(beginErr);

        let checkedCount = 0;
        let hasError = false;
        const users = [];

        function checkNextUser() {
          if (hasError) return;
          
          if (checkedCount >= participantIds.length) {
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
                  let processError = false;

                  function processNextParticipant() {
                    if (processError) return;

                    if (processedCount >= participantIds.length) {
                      db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                          db.run("ROLLBACK", () => {});
                          return reject(commitErr);
                        }
                        resolve({ message: 'Next round started successfully', roundNumber: newRoundNumber, newPotAmount });
                      });
                      return;
                    }

                    const userId = participantIds[processedCount];
                    processedCount++;

                    db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [additionalBet, userId], (err) => {
                      if (err) {
                        processError = true;
                        db.run("ROLLBACK", () => {});
                        return reject(err);
                      }

                      db.run("UPDATE pot SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [additionalBet], (err) => {
                        if (err) {
                          processError = true;
                          db.run("ROLLBACK", () => {});
                          return reject(err);
                        }

                        db.run(
                          "INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES (?, ?, 0, 1, ?, ?)",
                          [userId, null, additionalBet, gameId],
                          (err) => {
                            if (err) {
                              processError = true;
                              db.run("ROLLBACK", () => {});
                              return reject(err);
                            }

                            processNextParticipant();
                          }
                        );
                      });
                    });
                  }

                  processNextParticipant();
                }
              );
            });
            return;
          }

          const userId = participantIds[checkedCount];
          checkedCount++;

          db.get("SELECT id, name, balance FROM users WHERE id = ?", [userId], (err, user) => {
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

            if (parseFloat(user.balance) < parseFloat(additionalBet)) {
              hasError = true;
              db.run("ROLLBACK", () => {});
              return reject({ error: `Insufficient balance for ${user.name}` });
            }

            users.push(user);
            checkNextUser();
          });
        }

        checkNextUser();
      });
    });
  },

  selectRollTheBallWinner: async (gameId, winnerUserId) => {
    const { pool } = require('./db');
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if game exists
      const gameResult = await client.query(
        'SELECT pot_amount, status FROM games WHERE id = $1',
        [gameId]
      );
      
      if (gameResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        throw { error: 'Game not found' };
      }
      
      const game = gameResult.rows[0];
      
      if (game.status === 'completed') {
        await client.query('ROLLBACK');
        client.release();
        throw { error: 'Game is already completed' };
      }
      
      // Check if user is a participant
      const participantResult = await client.query(
        'SELECT user_id FROM game_participants WHERE game_id = $1 AND user_id = $2',
        [gameId, winnerUserId]
      );
      
      if (participantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        throw { error: 'Selected winner is not a participant in this game' };
      }
      
      const potAmount = parseFloat(game.pot_amount || 0);
      
      // Update pot
      await client.query(
        'UPDATE pot SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [potAmount]
      );
      
      // Update user balance
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [potAmount, winnerUserId]
      );
      
      // Insert transaction
      await client.query(
        'INSERT INTO transactions (from_user_id, to_user_id, from_pot, to_pot, amount, game_id) VALUES ($1, $2, 1, 0, $3, $4)',
        [null, winnerUserId, potAmount, gameId]
      );
      
      // Get winner name
      const winnerResult = await client.query(
        'SELECT name FROM users WHERE id = $1',
        [winnerUserId]
      );
      
      const winnerName = winnerResult.rows[0]?.name || winnerUserId.toString();
      
      // Update game status
      await client.query(
        "UPDATE games SET status = 'completed', winner = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2",
        [winnerName, gameId]
      );
      
      await client.query('COMMIT');
      client.release();
      
      return {
        message: 'Winner selected and pot distributed successfully',
        winnerUserId: winnerUserId,
        potAmount: potAmount
      };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      throw error;
    }
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
            const potAmount = Math.round(parseFloat(game.pot_amount || 0));
            const totalDistributed = distribution.reduce((sum, d) => {
              const amount = parseFloat(d.amount) || 0;
              return sum + Math.round(amount);
            }, 0);
            if (totalDistributed !== potAmount) {
              db.run("ROLLBACK", () => {});
              return reject({ 
                error: `Total distribution amount (${totalDistributed}) must equal pot amount (${potAmount})` 
              });
            }
            const winnerData = distribution.reduce((max, curr) => 
              (parseFloat(curr.amount) || 0) > (parseFloat(max.amount) || 0) ? curr : max
            );

            const userIds = distribution.map(d => parseInt(d.userId));
            const placeholders = userIds.map(() => '?').join(',');
            db.all(
              `SELECT DISTINCT user_id FROM game_participants WHERE game_id = ? AND user_id IN (${placeholders})`,
              [gameId, ...userIds],
              (err, participants) => {
                if (err) {
                  console.error('Error checking participants:', err);
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }
                const foundUserIds = participants.map(p => p.user_id);
                const uniqueFoundUserIds = [...new Set(foundUserIds)];
                const uniqueRequestedUserIds = [...new Set(userIds)];
                if (uniqueFoundUserIds.length !== uniqueRequestedUserIds.length) {
                  db.run("ROLLBACK", () => {});
                  return reject({ 
                    error: `Some participants are not in this game. Requested: [${uniqueRequestedUserIds.join(', ')}], Found: [${uniqueFoundUserIds.join(', ')}]` 
                  });
                }
                const missingUsers = uniqueRequestedUserIds.filter(id => !uniqueFoundUserIds.includes(id));
                if (missingUsers.length > 0) {
                  db.run("ROLLBACK", () => {});
                  return reject({ 
                    error: `Some participants are not in this game. Missing user IDs: [${missingUsers.join(', ')}]` 
                  });
                }
                const validDistributions = distribution.filter(d => (parseFloat(d.amount) || 0) > 0);
                let processedCount = 0;
                let hasError = false;
                const winnerUserIds = validDistributions.map(d => parseInt(d.userId));
                const winnerPlaceholders = winnerUserIds.map(() => '?').join(',');
                db.all(
                  `SELECT name FROM users WHERE id IN (${winnerPlaceholders})`,
                  winnerUserIds,
                  (err, winnerUsers) => {
                    if (err) {
                      db.run("ROLLBACK", () => {});
                      return reject(err);
                    }

                    const winnerNames = winnerUsers.map(u => u.name).join(', ');

                    function processNextDistribution() {
                      if (hasError) {
                        return;
                      }
                      if (processedCount >= validDistributions.length) {
                        db.run(
                          "UPDATE games SET status = 'completed', winner = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                          [winnerNames, gameId],
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
                    const amount = Math.round(parseFloat(dist.amount) || 0);
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
              }
            );
          });
        });
      });
    });
  },

  updateDealNoDealWinners: (gameId) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.all(
          "SELECT DISTINCT to_user_id FROM transactions WHERE game_id = ? AND from_pot = 1 AND to_user_id IS NOT NULL",
          [gameId],
          (err, transactions) => {
            if (err) {
              return reject(err);
            }

            if (transactions.length === 0) {
              return resolve({ message: 'No winners found for this game', winners: [] });
            }

            const winnerUserIds = transactions.map(t => t.to_user_id);
            const placeholders = winnerUserIds.map(() => '?').join(',');
            db.all(
              `SELECT name FROM users WHERE id IN (${placeholders})`,
              winnerUserIds,
              (err, winnerUsers) => {
                if (err) return reject(err);
                const winnerNames = winnerUsers.map(u => u.name).join(', ');
                db.run(
                  "UPDATE games SET status = 'completed', winner = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                  [winnerNames, gameId],
                  (err) => {
                    if (err) {
                      return reject(err);
                    }

                    resolve({
                      message: 'Winners updated successfully',
                      winners: winnerNames,
                      winnersCount: winnerUsers.length
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  },
};

const groupService = {
  getAllGroups: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT g.*, 
         (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
         (SELECT array_agg(u.name ORDER BY u.name) 
          FROM group_members gm 
          INNER JOIN users u ON gm.user_id = u.id 
          WHERE gm.group_id = g.id) as member_names
         FROM groups g ORDER BY g.created_at DESC`,
        [],
        (err, groups) => {
          if (err) return reject(err);
          
          // Parse member_names from PostgreSQL array format
          const formattedGroups = groups.map(group => {
            let memberNames = [];
            if (group.member_names) {
              if (Array.isArray(group.member_names)) {
                memberNames = group.member_names;
              } else if (typeof group.member_names === 'string') {
                // Remove curly braces and split by comma
                const namesStr = group.member_names.replace(/[{}]/g, '');
                memberNames = namesStr ? namesStr.split(',').map(name => name.trim()).filter(name => name) : [];
              }
            }
            return {
              ...group,
              member_names: memberNames
            };
          });
          
          resolve(formattedGroups);
        }
      );
    });
  },

  getGroupById: (groupId) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM groups WHERE id = ?", [groupId], (err, group) => {
        if (err) return reject(err);
        if (!group) return reject({ error: 'Group not found' });
        resolve(group);
      });
    });
  },

  getGroupMembers: (groupId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.name, u.balance 
         FROM users u 
         INNER JOIN group_members gm ON u.id = gm.user_id 
         WHERE gm.group_id = ? 
         ORDER BY u.name`,
        [groupId],
        (err, members) => {
          if (err) return reject(err);
          resolve(members);
        }
      );
    });
  },

  createGroup: (name, description, memberIds = []) => {
    return new Promise((resolve, reject) => {
      if (!name || name.trim() === '') {
        return reject({ error: 'Group name is required' });
      }

      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);

          db.run(
            "INSERT INTO groups (name, description) VALUES (?, ?)",
            [name.trim(), description ? description.trim() : null],
            function(err) {
              if (err) {
                db.run("ROLLBACK", () => {});
                if (err.message && err.message.includes('UNIQUE constraint')) {
                  return reject({ error: 'Group name already exists' });
                }
                return reject(err);
              }

              const groupId = this.lastID;

              if (!memberIds || memberIds.length === 0) {
                // No members to add, just commit
                db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    db.run("ROLLBACK", () => {});
                    return reject(commitErr);
                  }
                  resolve({ id: groupId, name: name.trim(), description: description ? description.trim() : null });
                });
                return;
              }

              // Add members in batch
              const placeholders = memberIds.map(() => '(?, ?)').join(', ');
              const memberParams = memberIds.flatMap(userId => [groupId, userId]);
              const insertQuery = `INSERT INTO group_members (group_id, user_id) VALUES ${placeholders} ON CONFLICT (group_id, user_id) DO NOTHING`;

              db.run(insertQuery, memberParams, (err) => {
                if (err) {
                  db.run("ROLLBACK", () => {});
                  return reject(err);
                }

                db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    db.run("ROLLBACK", () => {});
                    return reject(commitErr);
                  }
                  resolve({ id: groupId, name: name.trim(), description: description ? description.trim() : null });
                });
              });
            }
          );
        });
      });
    });
  },

  updateGroup: (groupId, name, description) => {
    return new Promise((resolve, reject) => {
      if (!name || name.trim() === '') {
        return reject({ error: 'Group name is required' });
      }

      db.run(
        "UPDATE groups SET name = ?, description = ? WHERE id = ?",
        [name.trim(), description ? description.trim() : null, groupId],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint')) {
              return reject({ error: 'Group name already exists' });
            }
            return reject(err);
          }
          if (this.changes === 0) {
            return reject({ error: 'Group not found' });
          }
          resolve({ message: 'Group updated successfully' });
        }
      );
    });
  },

  deleteGroup: (groupId) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM groups WHERE id = ?", [groupId], function(err) {
        if (err) return reject(err);
        if (this.changes === 0) {
          return reject({ error: 'Group not found' });
        }
        resolve({ message: 'Group deleted successfully' });
      });
    });
  },

  addMemberToGroup: (groupId, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO group_members (group_id, user_id) VALUES (?, ?) ON CONFLICT (group_id, user_id) DO NOTHING",
        [groupId, userId],
        function(err) {
          if (err) return reject(err);
          resolve({ message: 'Member added to group successfully' });
        }
      );
    });
  },

  removeMemberFromGroup: (groupId, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
        [groupId, userId],
        function(err) {
          if (err) return reject(err);
          resolve({ message: 'Member removed from group successfully' });
        }
      );
    });
  },

  addMultipleMembersToGroup: (groupId, userIds) => {
    return new Promise((resolve, reject) => {
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return reject({ error: 'User IDs array is required' });
      }

      db.serialize(() => {
        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) return reject(beginErr);

          let processedCount = 0;
          let hasError = false;

          // Batch insert all members at once using PostgreSQL syntax
          const placeholders = userIds.map(() => '(?, ?)').join(', ');
          const params = userIds.flatMap(userId => [groupId, userId]);
          const insertQuery = `INSERT INTO group_members (group_id, user_id) VALUES ${placeholders} ON CONFLICT (group_id, user_id) DO NOTHING`;

          db.run(insertQuery, params, (err) => {
            if (err) {
              db.run("ROLLBACK", () => {});
              return reject(err);
            }
            db.run("COMMIT", (commitErr) => {
              if (commitErr) {
                db.run("ROLLBACK", () => {});
                return reject(commitErr);
              }
              resolve({ message: `${userIds.length} member(s) added to group successfully` });
            });
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

const rewardService = {
  async createReward(rewardData) {
    return new Promise((resolve, reject) => {
      const { name, image_url, price, quantity } = rewardData;
      db.run(
        `INSERT INTO rewards (name, image_url, price, quantity) VALUES (?, ?, ?, ?)`,
        [name, image_url || null, price || 0, quantity || 0],
        function(err) {
          if (err) {
            reject(err);
          } else {
            db.get(`SELECT * FROM rewards WHERE id = ?`, [this.lastID], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          }
        }
      );
    });
  },

  async getAllRewards() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM rewards ORDER BY price DESC`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  async getRewardById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM rewards WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  async updateReward(id, rewardData) {
    return new Promise((resolve, reject) => {
      const { name, image_url, price, quantity } = rewardData;
      db.run(
        `UPDATE rewards SET name = ?, image_url = ?, price = ?, quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, image_url || null, price, quantity, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            db.get(`SELECT * FROM rewards WHERE id = ?`, [id], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          }
        }
      );
    });
  },

  async deleteReward(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM rewards WHERE id = ?`, [id], function(err) {
        if (err) reject(err);
        else resolve({ message: 'Reward deleted successfully' });
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
  adminService,
  groupService,
  rewardService
};

