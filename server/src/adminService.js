const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware');

const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = 'admin@kitty3948';

const adminService = {
  login: (username, password) => {
    return new Promise((resolve, reject) => {
      const trimmedUsername = username?.trim();
      const trimmedPassword = password?.trim();
      if (!trimmedUsername || !trimmedPassword) {
        return reject({ error: 'Username and password are required' });
      }
      if (trimmedUsername !== ADMIN_USERNAME) {
        return reject({ error: 'Invalid username or password' });
      }
      if (trimmedPassword !== ADMIN_PASSWORD) {
        return reject({ error: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { 
          username: ADMIN_USERNAME,
          role: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      resolve({
        token,
        username: ADMIN_USERNAME,
        role: 'admin'
      });
    });
  },

  verifyToken: (token) => {
    return new Promise((resolve, reject) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
          return reject({ error: 'Invalid token role' });
        }
        resolve(decoded);
      } catch (error) {
        reject(error);
      }
    });
  }
};

module.exports = adminService;

