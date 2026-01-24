const { userService, potService, transactionService, familyService, gameService, adminService, groupService, rewardService } = require('./service');
const adminAuthService = require('./adminService');
const { db } = require('./db');

const userController = {
  getUsersRanking: async (req, res) => {
    try {
      const users = await userService.getUsersRanking();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getUsers: async (req, res) => {
    try {
      const users = await userService.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getCaptains: async (req, res) => {
    try {
      const captains = await userService.getCaptains();
      res.json(captains);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  registerCaptains: async (req, res) => {
    try {
      const { names, initialAmount } = req.body;
      if (!names || !Array.isArray(names) || names.length === 0) {
        return res.status(400).json({ error: 'Names array is required' });
      }
      if (!initialAmount || initialAmount <= 0) {
        return res.status(400).json({ error: 'Valid initial amount is required' });
      }
      const result = await userService.registerCaptains(names, initialAmount);
      res.json(result);
    } catch (error) {
      if (error.errors) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  registerMembers: async (req, res) => {
    try {
      const { names, initialAmount, captainId } = req.body;
      if (!names || !Array.isArray(names) || names.length === 0) {
        return res.status(400).json({ error: 'Names array is required' });
      }
      if (!initialAmount || initialAmount <= 0) {
        return res.status(400).json({ error: 'Valid initial amount is required' });
      }
      if (!captainId) {
        return res.status(400).json({ error: 'Captain ID is required' });
      }
      const result = await userService.registerMembers(names, initialAmount, captainId);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else if (error.errors) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id;
      const result = await userService.deleteUser(userId);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  updateBalance: async (req, res) => {
    try {
      const { userId, amount, gameType } = req.body;
      if (!userId || amount === undefined) {
        return res.status(400).json({ error: 'User ID and amount are required' });
      }
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
      const result = await userService.updateBalance(userId, amountNum, gameType);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      const user = await userService.login(username, password);
      res.json(user);
    } catch (error) {
      if (error.error) {
        res.status(401).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  loginByUserId: async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      const user = await userService.loginByUserId(userId);
      res.json(user);
    } catch (error) {
      if (error.error) {
        res.status(401).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  getUserById: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await userService.getUserById(userId);
      res.json(user);
    } catch (error) {
      if (error.error) {
        res.status(404).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  getUserTransactions: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const transactions = await userService.getUserTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getUserGames: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const games = await userService.getUserGames(userId);
      res.json(games);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getUserFamilyBalance: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const result = await userService.getUserFamilyBalance(userId);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(404).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
};

const potController = {
  getPotBalance: async (req, res) => {
    try {
      const result = await potService.getPotBalance();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

const transactionController = {
  createTransaction: async (req, res) => {
    try {
      const { fromUserId, toUserId, fromPot, toPot, amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }
      const isFromPot = fromPot === true || fromPot === 1;
      const isToPot = toPot === true || toPot === 1;
      if ((!fromUserId && !isFromPot) || (!toUserId && !isToPot)) {
        return res.status(400).json({ error: 'Invalid transaction parameters' });
      }
      if (isFromPot && isToPot) {
        return res.status(400).json({ error: 'Cannot transfer from Pot to Pot' });
      }
      if (!isFromPot && !isToPot && fromUserId === toUserId) {
        return res.status(400).json({ error: 'Cannot transfer to the same user' });
      }
      const result = await transactionService.createTransaction(fromUserId, toUserId, fromPot, toPot, amount);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  createBatchTransactions: async (req, res) => {
    try {
      const { transactions } = req.body;
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ error: 'Transactions array is required' });
      }
      for (const txn of transactions) {
        const { fromUserId, toUserId, fromPot, toPot, amount } = txn;
        const amountInt = parseInt(amount);
        if (!amount || isNaN(amountInt) || amountInt <= 0) {
          return res.status(400).json({ error: 'Valid amount is required for all transactions' });
        }
        const isFromPot = fromPot === true || fromPot === 1;
        const isToPot = toPot === true || toPot === 1;
        if ((!fromUserId && !isFromPot) || (!toUserId && !isToPot)) {
          return res.status(400).json({ error: 'Invalid transaction parameters' });
        }
        if (isFromPot && isToPot) {
          return res.status(400).json({ error: 'Cannot transfer from Pot to Pot' });
        }
        if (!isFromPot && !isToPot && fromUserId === toUserId) {
          return res.status(400).json({ error: 'Cannot transfer to the same user' });
        }
      }
      const result = await transactionService.createBatchTransactions(transactions);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  getTransactionHistory: async (req, res) => {
    try {
      const transactions = await transactionService.getTransactionHistory();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

const familyController = {
  getFamilyRanking: async (req, res) => {
    try {
      const ranking = await familyService.getFamilyRanking();
      res.json(ranking);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getFamiliesUsers: async (req, res) => {
    try {
      const families = await familyService.getFamiliesUsers();
      res.json(families);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

const gameController = {
  getAllGames: async (req, res) => {
    try {
      const games = await gameService.getAllGames();
      res.json(games);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getGameParticipants: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const participants = await gameService.getGameParticipants(gameId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteGame: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const result = await gameService.deleteGame(gameId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteLastRouletteGame: async (req, res) => {
    try {
      const result = await gameService.deleteLastRouletteGame();
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(404).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  startGame: async (req, res) => {
    try {
      const { entryFee, participants, gameType = '7up7down' } = req.body;
      if (!entryFee || entryFee <= 0) {
        return res.status(400).json({ error: 'Valid entry fee is required' });
      }
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({ error: 'At least one participant is required' });
      }
      const userIds = participants.map(p => p.userId);
      const uniqueUserIds = [...new Set(userIds)];
      if (uniqueUserIds.length !== userIds.length) {
        return res.status(400).json({ error: 'Duplicate participants are not allowed' });
      }
      const result = await gameService.startGame(entryFee, participants, gameType);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  selectWinner: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const { winner } = req.body;
      if (!winner || (winner !== 'up' && winner !== 'down')) {
        return res.status(400).json({ error: 'Valid winner (up or down) is required' });
      }
      const result = await gameService.selectWinner(gameId, winner);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  saveRouletteNumbers: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const { participantNumbers } = req.body;
      if (!participantNumbers || !Array.isArray(participantNumbers)) {
        return res.status(400).json({ error: 'Participant numbers array is required' });
      }
      for (const pn of participantNumbers) {
        if (pn.number < 0 || pn.number > 36) {
          return res.status(400).json({ error: 'Number must be between 0 and 36' });
        }
      }
      const result = await gameService.saveRouletteNumbers(gameId, participantNumbers);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  spinRoulette: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const { spinResult: manualResult } = req.body;
      const result = await gameService.spinRoulette(gameId, manualResult);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  getRouletteWinners: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const result = await gameService.getRouletteWinners(gameId);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  declareNearestWinner: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const result = await gameService.declareNearestWinner(gameId);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  distributeRoulettePot: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const { winnerUserIds } = req.body;
      if (!winnerUserIds || !Array.isArray(winnerUserIds) || winnerUserIds.length === 0) {
        return res.status(400).json({ error: 'Winner user IDs array is required' });
      }
      const result = await gameService.distributeRoulettePot(gameId, winnerUserIds);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  startNextRound: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const { additionalBet, participantIds } = req.body;
      if (!additionalBet || additionalBet <= 0) {
        return res.status(400).json({ error: 'Valid additional bet amount is required' });
      }
      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({ error: 'Participant IDs array is required' });
      }
      const result = await gameService.startNextRound(gameId, additionalBet, participantIds);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  selectRollTheBallWinner: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const { winnerUserId } = req.body;
      if (!winnerUserId) {
        return res.status(400).json({ error: 'Winner user ID is required' });
      }
      const result = await gameService.selectRollTheBallWinner(gameId, winnerUserId);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  distributePokerPot: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const { distribution } = req.body;
      if (!distribution || !Array.isArray(distribution) || distribution.length === 0) {
        return res.status(400).json({ error: 'Distribution array is required' });
      }
      const result = await gameService.distributePokerPot(gameId, distribution);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  updateDealNoDealWinners: async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const result = await gameService.updateDealNoDealWinners(gameId);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
};

const adminController = {
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      const result = await adminAuthService.login(username, password);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(401).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  flushDatabase: async (req, res) => {
    try {
      const result = await adminService.flushDatabase();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

const groupController = {
  getAllGroups: async (req, res) => {
    try {
      const groups = await groupService.getAllGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getGroupById: async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await groupService.getGroupById(groupId);
      const members = await groupService.getGroupMembers(groupId);
      res.json({ ...group, members });
    } catch (error) {
      if (error.error) {
        res.status(404).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  createGroup: async (req, res) => {
    try {
      const { name, description, memberIds } = req.body;
      const group = await groupService.createGroup(name, description, memberIds || []);
      res.json(group);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  updateGroup: async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { name, description } = req.body;
      const result = await groupService.updateGroup(groupId, name, description);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  deleteGroup: async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const result = await groupService.deleteGroup(groupId);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(404).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  addMemberToGroup: async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      const result = await groupService.addMemberToGroup(groupId, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  removeMemberFromGroup: async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const result = await groupService.removeMemberFromGroup(groupId, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  addMultipleMembersToGroup: async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { userIds } = req.body;
      const result = await groupService.addMultipleMembersToGroup(groupId, userIds);
      res.json(result);
    } catch (error) {
      if (error.error) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
};

const rewardController = {
  createReward: async (req, res) => {
    try {
      const rewardData = { ...req.body };
      if (req.file) {
        if (req.file.path) {
          rewardData.image_url = req.file.path;
        } else if (req.file.filename) {
          rewardData.image_url = `/uploads/rewards/${req.file.filename}`;
        }
      }
      const reward = await rewardService.createReward(rewardData);
      res.status(201).json(reward);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getAllRewards: async (req, res) => {
    try {
      const rewards = await rewardService.getAllRewards();
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getRewardById: async (req, res) => {
    try {
      const reward = await rewardService.getRewardById(req.params.id);
      if (!reward) {
        return res.status(404).json({ error: 'Reward not found' });
      }
      res.json(reward);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateReward: async (req, res) => {
    try {
      const rewardData = { ...req.body };
      if (req.file) {
        if (req.file.path) {
          rewardData.image_url = req.file.path;
        } else if (req.file.filename) {
          rewardData.image_url = `/uploads/rewards/${req.file.filename}`;
        }
      }
      const reward = await rewardService.updateReward(req.params.id, rewardData);
      res.json(reward);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteReward: async (req, res) => {
    try {
      await rewardService.deleteReward(req.params.id);
      res.json({ message: 'Reward deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = {
  userController,
  potController,
  transactionController,
  familyController,
  gameController,
  adminController,
  groupController,
  rewardController
};

