require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { initializeDatabase } = require('./src/db');
const { userController, potController, transactionController, familyController, gameController, adminController, groupController, rewardController } = require('./src/controller');
const { authenticateAdmin } = require('./src/middleware');

const app = express();
const PORT = process.env.PORT || 3001;

let upload;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'rewards',
      allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
      transformation: [{ width: 800, height: 800, crop: 'limit' }]
    }
  });

  upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed!'));
      }
    }
  });
} else {
  console.log('⚠️  Cloudinary not configured. Using local file storage. Set CLOUDINARY_* env vars for production.');
  const uploadsDir = path.join(__dirname, 'uploads', 'rewards');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'reward-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed!'));
      }
    }
  });
}

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

initializeDatabase().then(() => {
  app.get('/api/users/ranking', userController.getUsersRanking);
  app.get('/api/pot', potController.getPotBalance);
  app.get('/api/families/ranking', familyController.getFamilyRanking);
  app.post('/api/client/login', userController.login);
  app.get('/api/client/users/:userId', userController.getUserById);
  app.get('/api/client/users/:userId/transactions', userController.getUserTransactions);
  app.get('/api/client/users/:userId/games', userController.getUserGames);
  app.get('/api/client/users/:userId/family-balance', userController.getUserFamilyBalance);
  app.get('/api/client/rewards', rewardController.getAllRewards);
  app.post('/api/admin/login', adminController.login);
  app.get('/api/users', authenticateAdmin, userController.getUsers);
  app.get('/api/users/captains', authenticateAdmin, userController.getCaptains);
  app.post('/api/users/register-captains', authenticateAdmin, userController.registerCaptains);
  app.post('/api/users/register-members', authenticateAdmin, userController.registerMembers);
  app.delete('/api/users/:id', authenticateAdmin, userController.deleteUser);
  app.post('/api/users/update-balance', authenticateAdmin, userController.updateBalance);
  app.post('/api/transactions/batch', authenticateAdmin, transactionController.createBatchTransactions);
  app.post('/api/transactions', authenticateAdmin, transactionController.createTransaction);
  app.get('/api/transactions', authenticateAdmin, transactionController.getTransactionHistory);
  app.get('/api/families/users', authenticateAdmin, familyController.getFamiliesUsers);
  app.get('/api/games', authenticateAdmin, gameController.getAllGames);
  app.get('/api/games/:gameId/participants', authenticateAdmin, gameController.getGameParticipants);
  app.delete('/api/games/:gameId', authenticateAdmin, gameController.deleteGame);
  app.delete('/api/games/roulette/last', authenticateAdmin, gameController.deleteLastRouletteGame);
  app.post('/api/games/start', authenticateAdmin, gameController.startGame);
  app.post('/api/games/:gameId/select-winner', authenticateAdmin, gameController.selectWinner);
  app.post('/api/games/:gameId/roulette/numbers', authenticateAdmin, gameController.saveRouletteNumbers);
  app.post('/api/games/:gameId/roulette/spin', authenticateAdmin, gameController.spinRoulette);
  app.get('/api/games/:gameId/roulette/winners', authenticateAdmin, gameController.getRouletteWinners);
  app.post('/api/games/:gameId/roulette/declare-nearest', authenticateAdmin, gameController.declareNearestWinner);
  app.post('/api/games/:gameId/roulette/distribute', authenticateAdmin, gameController.distributeRoulettePot);
  app.post('/api/games/:gameId/roulette/next-round', authenticateAdmin, gameController.startNextRound);
  app.post('/api/games/:gameId/rolltheball/select-winner', authenticateAdmin, gameController.selectRollTheBallWinner);
  app.post('/api/games/:gameId/poker/distribute', authenticateAdmin, gameController.distributePokerPot);
  app.post('/api/games/:gameId/dealnodeal/update-winners', authenticateAdmin, gameController.updateDealNoDealWinners);
  app.post('/api/admin/flush-database', authenticateAdmin, adminController.flushDatabase);
  
  app.get('/api/groups', authenticateAdmin, groupController.getAllGroups);
  app.get('/api/groups/:id', authenticateAdmin, groupController.getGroupById);
  app.post('/api/groups', authenticateAdmin, groupController.createGroup);
  app.put('/api/groups/:id', authenticateAdmin, groupController.updateGroup);
  app.delete('/api/groups/:id', authenticateAdmin, groupController.deleteGroup);
  app.post('/api/groups/:id/members', authenticateAdmin, groupController.addMemberToGroup);
  app.delete('/api/groups/:id/members/:userId', authenticateAdmin, groupController.removeMemberFromGroup);
  app.post('/api/groups/:id/members/batch', authenticateAdmin, groupController.addMultipleMembersToGroup);

  app.get('/api/rewards', authenticateAdmin, rewardController.getAllRewards);
  app.get('/api/rewards/:id', authenticateAdmin, rewardController.getRewardById);
  app.post('/api/rewards', authenticateAdmin, upload.single('image'), rewardController.createReward);
  app.put('/api/rewards/:id', authenticateAdmin, upload.single('image'), rewardController.updateReward);
  app.delete('/api/rewards/:id', authenticateAdmin, rewardController.deleteReward);
  
  app.post('/api/rewards/upload', authenticateAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Cloudinary returns req.file.path, local storage returns req.file.filename
    const imageUrl = req.file.path || `/uploads/rewards/${req.file.filename}`;
    res.json({ imageUrl });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
