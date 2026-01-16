const { Pool } = require('pg');
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
  console.error('Please set DATABASE_URL to your PostgreSQL connection string.');
  console.error('See DATABASE_SETUP.md for instructions.');
  process.exit(1);
}
const connectionString = process.env.DATABASE_URL;
const isCloudDatabase = connectionString?.includes('supabase') || 
                        connectionString?.includes('neon') || 
                        connectionString?.includes('railway') ||
                        connectionString?.includes('render') ||
                        connectionString?.includes('heroku');

const poolConfig = {
  connectionString: connectionString,
  ssl: isCloudDatabase ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
  allowExitOnIdle: false,
  statement_timeout: 30000, // 30 seconds
  query_timeout: 30000, // 30 seconds
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};
const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
  // Don't exit the process, just log the error
  // The pool will automatically remove the bad client
});

pool.on('connect', (client) => {
  // Set statement timeout for each connection
  client.query('SET statement_timeout = 30000').catch(err => {
    console.error('Error setting statement_timeout:', err);
  });
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.message);
    console.error('Please check your DATABASE_URL connection string.');
    process.exit(1);
  } else {
    console.log('✅ Connected to PostgreSQL database');
  }
});

const db = {
  serialize: (callback) => {
    if (callback) callback();
  },
  run: (query, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    if (!params) params = [];
    let finalQuery = query.trim();
    if (finalQuery.toUpperCase() === 'BEGIN TRANSACTION') {
      finalQuery = 'BEGIN';
    } else if (finalQuery.toUpperCase() === 'COMMIT') {
      finalQuery = 'COMMIT';
    } else if (finalQuery.toUpperCase() === 'ROLLBACK') {
      finalQuery = 'ROLLBACK';
    } else {
      // Convert INSERT OR REPLACE to PostgreSQL ON CONFLICT syntax
      if (/^\s*INSERT\s+OR\s+REPLACE\s+INTO/i.test(finalQuery)) {
        // Extract table name and columns
        const match = finalQuery.match(/INSERT\s+OR\s+REPLACE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES/i);
        if (match) {
          const tableName = match[1];
          const columns = match[2].split(',').map(c => c.trim());
          
          // Determine conflict columns based on table
          let conflictColumns;
          if (tableName === 'game_participants') {
            // game_participants has UNIQUE constraint on (game_id, user_id, round_number)
            conflictColumns = 'game_id, user_id, round_number';
          } else {
            // For other tables, use first column as fallback (may need adjustment)
            conflictColumns = columns[0];
          }
          
          // Update all columns except the conflict columns
          const updateColumns = columns.filter(col => {
            if (tableName === 'game_participants') {
              return !['game_id', 'user_id', 'round_number'].includes(col);
            }
            return col !== columns[0];
          });
          
          const updateClause = updateColumns.length > 0 
            ? updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ')
            : columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
          
          finalQuery = finalQuery.replace(
            /INSERT\s+OR\s+REPLACE\s+INTO/i,
            'INSERT INTO'
          ) + ` ON CONFLICT (${conflictColumns}) DO UPDATE SET ${updateClause}`;
        } else {
          // Fallback: just remove OR REPLACE
          finalQuery = finalQuery.replace(/\s+OR\s+REPLACE/i, '');
        }
      }
      
      // Convert ? placeholders to $1, $2, $3, etc. (PostgreSQL syntax)
      let paramIndex = 1;
      finalQuery = finalQuery.replace(/\?/g, () => `$${paramIndex++}`);
    }
    const isInsert = /^\s*INSERT\s+INTO/i.test(finalQuery);
    if (isInsert && !finalQuery.includes('RETURNING')) {
      finalQuery = finalQuery.replace(/\);?\s*$/i, ') RETURNING id');
    }
    
    pool.query(finalQuery, params)
      .then((res) => {
        try {
          const result = {
            lastID: null,
            changes: res.rowCount || 0
          };
          if (isInsert && res.rows && res.rows.length > 0 && res.rows[0].id) {
            result.lastID = res.rows[0].id;
          }
          const context = {
            lastID: result.lastID
          };
          
          if (callback && typeof callback === 'function') {
            callback.call(context, null);
          }
        } catch (callbackErr) {
          console.error('Error in callback:', callbackErr);
          if (callback && typeof callback === 'function') {
            try {
              callback.call({ lastID: null }, callbackErr);
            } catch (e) {
              console.error('Error calling error callback:', e);
            }
          }
        }
      })
      .catch((err) => {
        // Handle connection errors gracefully
        if (err.code === 'XX000' || err.message?.includes('DbHandler exited')) {
          console.error('❌ Database connection error (DbHandler exited). This may be a temporary issue.');
          console.error('Error details:', err.message);
          console.error('Query:', finalQuery.substring(0, 100));
        } else {
          console.error('Database query error:', err.message, 'Query:', finalQuery.substring(0, 100));
        }
        
        if (callback && typeof callback === 'function') {
          try {
            const context = { lastID: null };
            callback.call(context, err);
          } catch (callbackErr) {
            console.error('Error in error callback:', callbackErr);
          }
        } else {
          console.error('Database error (no callback):', err);
        }
      });
  },
  all: (query, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    if (!params) params = [];
    let finalQuery = query;
    if (params && params.length > 0) {
      let paramIndex = 1;
      finalQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    }
    
    pool.query(finalQuery, params)
      .then((res) => {
        if (callback && typeof callback === 'function') {
          callback(null, res.rows);
        }
      })
      .catch((err) => {
        // Handle connection errors gracefully
        if (err.code === 'XX000' || err.message?.includes('DbHandler exited')) {
          console.error('❌ Database connection error (DbHandler exited) in db.all');
          console.error('Error details:', err.message);
        }
        
        if (callback && typeof callback === 'function') {
          callback(err);
        } else {
          console.error('Database error:', err);
        }
      });
  },
  get: (query, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    if (!params) params = [];
    let finalQuery = query;
    if (params && params.length > 0) {
      let paramIndex = 1;
      finalQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    }
    
    pool.query(finalQuery, params)
      .then((res) => {
        if (callback && typeof callback === 'function') {
          callback(null, res.rows[0] || null);
        }
      })
      .catch((err) => {
        // Handle connection errors gracefully
        if (err.code === 'XX000' || err.message?.includes('DbHandler exited')) {
          console.error('❌ Database connection error (DbHandler exited) in db.get');
          console.error('Error details:', err.message);
        }
        
        if (callback && typeof callback === 'function') {
          callback(err);
        } else {
          console.error('Database error:', err);
        }
      });
  },
  prepare: (query) => {
    const isInsert = /^\s*INSERT\s+INTO/i.test(query.trim());
    let baseQuery = query;
    if (isInsert && !query.includes('RETURNING')) {
      baseQuery = query.replace(/\);?\s*$/i, ') RETURNING id');
    }
    return {
      run: (params, callback) => {
        if (typeof params === 'function') {
          callback = params;
          params = [];
        }
        if (!params) params = [];
        let finalQuery = baseQuery;
        if (params && params.length > 0) {
          let paramIndex = 1;
          finalQuery = baseQuery.replace(/\?/g, () => `$${paramIndex++}`);
        }
        
        pool.query(finalQuery, params)
          .then((res) => {
            const result = {
              lastID: null,
              changes: res.rowCount || 0
            };
            if (isInsert && res.rows && res.rows.length > 0 && res.rows[0].id) {
              result.lastID = res.rows[0].id;
            }
            const context = {
              lastID: result.lastID
            };
            
            if (callback && typeof callback === 'function') {
              // Bind the callback to the context so `this.lastID` works
              callback.call(context, null);
            }
          })
          .catch((err) => {
            if (callback && typeof callback === 'function') {
              const context = { lastID: null };
              callback.call(context, err);
            }
          });
      },
      finalize: () => {}
    };
  },
  close: (callback) => {
    pool.end()
      .then(() => {
        if (callback && typeof callback === 'function') {
          callback(null);
        }
      })
      .catch((err) => {
        if (callback && typeof callback === 'function') {
          callback(err);
        }
      });
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nClosing database connection...');
  pool.end()
    .then(() => {
      console.log('Database connection closed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error closing database:', err);
      process.exit(1);
    });
});

process.on('SIGTERM', () => {
  console.log('\nClosing database connection...');
  pool.end()
    .then(() => {
      console.log('Database connection closed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error closing database:', err);
      process.exit(1);
    });
});

function initializeDatabase() {
  return new Promise(async (resolve, reject) => {
    try {
      // Create all tables sequentially using promises
      const createUsersTable = `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        balance NUMERIC NOT NULL DEFAULT 0,
        is_captain INTEGER DEFAULT 0,
        captain_id INTEGER,
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (captain_id) REFERENCES users(id)
      )`;

      const createPotTable = `CREATE TABLE IF NOT EXISTS pot (
        id INTEGER PRIMARY KEY,
        balance NUMERIC NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

      const createGamesTable = `CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        game_type TEXT NOT NULL DEFAULT '7up7down',
        entry_fee NUMERIC NOT NULL,
        pot_amount NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        winner TEXT,
        spin_result INTEGER,
        round_number INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )`;

      const createTransactionsTable = `CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER,
        to_user_id INTEGER,
        from_pot INTEGER DEFAULT 0,
        to_pot INTEGER DEFAULT 0,
        amount NUMERIC NOT NULL,
        game_id INTEGER,
        game_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users(id),
        FOREIGN KEY (to_user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
      )`;

      const createGameParticipantsTable = `CREATE TABLE IF NOT EXISTS game_participants (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        choice TEXT,
        number INTEGER,
        round_number INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(game_id, user_id, round_number)
      )`;

      const createGroupsTable = `CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

      const createGroupMembersTable = `CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(group_id, user_id)
      )`;

      const createRewardsTable = `CREATE TABLE IF NOT EXISTS rewards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image_url TEXT,
        price NUMERIC NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

      // Create tables in order (respecting foreign key dependencies)
      await pool.query(createUsersTable);
      console.log('✅ Created users table');

      await pool.query(createPotTable);
      console.log('✅ Created pot table');

      await pool.query(createGamesTable);
      console.log('✅ Created games table');

      await pool.query(createTransactionsTable);
      console.log('✅ Created transactions table');

      await pool.query(createGameParticipantsTable);
      console.log('✅ Created game_participants table');

      await pool.query(createGroupsTable);
      console.log('✅ Created groups table');

      await pool.query(createGroupMembersTable);
      console.log('✅ Created group_members table');

      await pool.query(createRewardsTable);
      console.log('✅ Created rewards table');

      // Now run migrations after all tables are created
      await runMigrations();
      
      // Initialize pot
      await initializePot();
      
      console.log('✅ Database initialization complete');
        resolve();
    } catch (err) {
      console.error('❌ Error initializing database:', err);
      reject(err);
    }
  });
}

function runMigrations() {
  return new Promise((resolve) => {
    // Check users table columns
    pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `)
      .then((res) => {
        const columnNames = res.rows.map(row => row.column_name);
      const needsIsCaptain = !columnNames.includes('is_captain');
      const needsCaptainId = !columnNames.includes('captain_id');
      const needsPassword = !columnNames.includes('password');

        const promises = [];

      if (needsIsCaptain) {
          promises.push(
            pool.query("ALTER TABLE users ADD COLUMN is_captain INTEGER DEFAULT 0")
              .then(() => console.log("Added is_captain column to users table"))
              .catch(err => console.error("Error adding is_captain column:", err))
          );
      }

      if (needsPassword) {
          promises.push(
            pool.query("ALTER TABLE users ADD COLUMN password TEXT")
              .then(() => console.log("Added password column to users table"))
              .catch(err => console.error("Error adding password column:", err))
          );
      }

      if (needsCaptainId) {
          promises.push(
            pool.query("ALTER TABLE users ADD COLUMN captain_id INTEGER")
              .then(() => console.log("Added captain_id column to users table"))
              .catch(err => console.error("Error adding captain_id column:", err))
          );
        }

        return Promise.all(promises);
      })
      .then(() => {
        // Check transactions table
        return pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'transactions'
        `);
      })
      .then((res) => {
        const columnNames = res.rows.map(row => row.column_name);
      const needsFromPot = !columnNames.includes('from_pot');
      const needsToPot = !columnNames.includes('to_pot');
      const needsGameId = !columnNames.includes('game_id');
      const needsGameType = !columnNames.includes('game_type');

        const promises = [];

      if (needsFromPot) {
          promises.push(
            pool.query("ALTER TABLE transactions ADD COLUMN from_pot INTEGER DEFAULT 0")
              .then(() => console.log("Added from_pot column to transactions table"))
              .catch(err => console.error("Error adding from_pot column:", err))
          );
      }

      if (needsToPot) {
          promises.push(
            pool.query("ALTER TABLE transactions ADD COLUMN to_pot INTEGER DEFAULT 0")
              .then(() => console.log("Added to_pot column to transactions table"))
              .catch(err => console.error("Error adding to_pot column:", err))
          );
      }

      if (needsGameId) {
          promises.push(
            pool.query("ALTER TABLE transactions ADD COLUMN game_id INTEGER")
              .then(() => console.log("Added game_id column to transactions table"))
              .catch(err => console.error("Error adding game_id column:", err))
          );
      }

      if (needsGameType) {
          promises.push(
            pool.query("ALTER TABLE transactions ADD COLUMN game_type TEXT")
              .then(() => console.log("Added game_type column to transactions table"))
              .catch(err => console.error("Error adding game_type column:", err))
          );
        }

        return Promise.all(promises);
      })
      .then(() => {
        // Delete Pot user if exists
        return pool.query("DELETE FROM users WHERE name = 'Pot'")
          .catch(err => console.error("Error removing Pot user:", err));
      })
      .then(() => {
        // Check games table
        return pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'games'
        `);
      })
      .then((res) => {
        const columnNames = res.rows.map(row => row.column_name);
        const promises = [];
        
      if (!columnNames.includes('game_type')) {
          promises.push(
            pool.query("ALTER TABLE games ADD COLUMN game_type TEXT NOT NULL DEFAULT '7up7down'")
              .then(() => console.log("Added game_type column to games table"))
              .catch(err => console.error("Error adding game_type column:", err))
          );
      }
      if (!columnNames.includes('spin_result')) {
          promises.push(
            pool.query("ALTER TABLE games ADD COLUMN spin_result INTEGER")
              .then(() => console.log("Added spin_result column to games table"))
              .catch(err => console.error("Error adding spin_result column:", err))
          );
      }
      if (!columnNames.includes('round_number')) {
          promises.push(
            pool.query("ALTER TABLE games ADD COLUMN round_number INTEGER DEFAULT 1")
              .then(() => console.log("Added round_number column to games table"))
              .catch(err => console.error("Error adding round_number column:", err))
          );
        }

        return Promise.all(promises);
      })
      .then(() => {
        // Check game_participants table
        return pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'game_participants'
        `);
      })
      .then((res) => {
        const columnNames = res.rows.map(row => row.column_name);
        const promises = [];
        
      if (!columnNames.includes('number')) {
          promises.push(
            pool.query("ALTER TABLE game_participants ADD COLUMN number INTEGER")
              .then(() => console.log("Added number column to game_participants table"))
              .catch(err => console.error("Error adding number column:", err))
          );
      }
      if (!columnNames.includes('round_number')) {
          promises.push(
            pool.query("ALTER TABLE game_participants ADD COLUMN round_number INTEGER DEFAULT 1")
              .then(() => console.log("Added round_number column to game_participants table"))
              .catch(err => console.error("Error adding round_number column:", err))
          );
        }

        return Promise.all(promises);
      })
      .then(() => resolve())
      .catch((err) => {
        console.error("Migration error:", err);
        resolve(); // Don't fail, just log
    });
  });
}

function initializePot() {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await pool.query("SELECT id FROM pot WHERE id = 1");
      if (result.rows.length === 0) {
        await pool.query("INSERT INTO pot (id, balance) VALUES (1, 0)");
        console.log('✅ Initialized pot');
      }
      resolve();
    } catch (err) {
      console.error('Error initializing pot:', err);
      reject(err);
    }
  });
}

module.exports = {
  db,
  pool,
  initializeDatabase
};
