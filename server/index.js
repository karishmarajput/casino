const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeDatabase } = require('./src/db');
const { userController, potController, transactionController, familyController, gameController, adminController } = require('./src/controller');
const { authenticateAdmin } = require('./src/middleware');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

initializeDatabase().then(() => {
  // Public routes (no authentication required)
  app.get('/api/users/ranking', userController.getUsersRanking);
  app.get('/api/pot', potController.getPotBalance);
  app.get('/api/families/ranking', familyController.getFamilyRanking);
  app.post('/api/client/login', userController.login);
  app.get('/api/client/users/:userId', userController.getUserById);
  app.get('/api/client/users/:userId/transactions', userController.getUserTransactions);
  app.get('/api/client/users/:userId/games', userController.getUserGames);
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
  app.post('/api/admin/flush-database', authenticateAdmin, adminController.flushDatabase);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
