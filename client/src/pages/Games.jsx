import React, { useState } from 'react';
import Roulette from './games/Roulette';
import RollTheBall from './games/RollTheBall';
import Poker from './games/Poker';
import DealNoDeal from './games/DealNoDeal';
import SevenUpSevenDown from './games/SevenUpSevenDown';
import './Games.css';

function Games() {
  const [selectedGameType, setSelectedGameType] = useState(null);

  const availableGames = [
    {
      id: '7up7down',
      name: '7 Up & 7 Down',
      icon: '🎲',
      description: 'Bet on whether the dice will roll 7 up or 7 down'
    },
    {
      id: 'roulette',
      name: 'Roulette',
      icon: '🎰',
      description: 'Spin the wheel and bet on numbers 0-36'
    },
    {
      id: 'rolltheball',
      name: 'Roll the Ball',
      icon: '⚽',
      description: 'Select participants and choose the winner'
    },
    {
      id: 'poker',
      name: 'Poker',
      icon: '🃏',
      description: 'Play poker and distribute pot to participants'
    },
    {
      id: 'dealnodeal',
      name: 'Deal No Deal',
      icon: '🎁',
      description: 'Spin the wheel and manage participant amounts'
    }
  ];

  const handleGameSelect = (gameId) => {
    setSelectedGameType(gameId);
  };

  const handleBackToMenu = () => {
    setSelectedGameType(null);
  };

  if (!selectedGameType) {
    return (
      <div className="games-container">
        <div className="games-menu">
          {availableGames.map((game) => (
            <div
              key={game.id}
              className="game-menu-card"
              onClick={() => handleGameSelect(game.id)}
            >
              <div className="game-menu-icon">{game.icon}</div>
              <div className="game-menu-content">
                <h3 className="game-menu-title">{game.name}</h3>
                <p className="game-menu-description">{game.description}</p>
              </div>
              <div className="game-menu-arrow">→</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const selectedGame = availableGames.find(g => g.id === selectedGameType);

  if (selectedGameType === 'roulette') {
    return (
      <div className="games-container roulette-page-container">
        <div className="game-header">
          <button className="back-to-menu-btn" onClick={handleBackToMenu}>
            ← Back to Menu
          </button>
          <h2 className="page-title">{selectedGame?.icon} {selectedGame?.name}</h2>
        </div>
        <Roulette onBack={handleBackToMenu} />
      </div>
    );
  }

  if (selectedGameType === 'rolltheball') {
    return (
      <div className="games-container">
        <div className="game-header">
          <button className="back-to-menu-btn" onClick={handleBackToMenu}>
            ← Back to Menu
          </button>
          <h2 className="page-title">{selectedGame?.icon} {selectedGame?.name}</h2>
        </div>
        <RollTheBall onBack={handleBackToMenu} />
      </div>
    );
  }

  if (selectedGameType === 'poker') {
    return (
      <div className="games-container">
        <div className="game-header">
          <button className="back-to-menu-btn" onClick={handleBackToMenu}>
            ← Back to Menu
          </button>
          <h2 className="page-title">{selectedGame?.icon} {selectedGame?.name}</h2>
        </div>
        <Poker onBack={handleBackToMenu} />
      </div>
    );
  }
  if (selectedGameType === 'dealnodeal') {
    return (
      <div className="games-container dealnodeal-full-width">
        <div className="game-header">
          <button className="back-to-menu-btn" onClick={handleBackToMenu}>
            ← Back to Menu
          </button>
          <h2 className="page-title">{selectedGame?.icon} {selectedGame?.name}</h2>
        </div>
        <DealNoDeal onBack={handleBackToMenu} />
      </div>
    );
  }

  if (selectedGameType === '7up7down') {
    return (
      <div className="games-container">
        <div className="game-header">
          <button className="back-to-menu-btn" onClick={handleBackToMenu}>
            ← Back to Menu
          </button>
          <h2 className="page-title">{selectedGame?.icon} {selectedGame?.name}</h2>
        </div>
        <SevenUpSevenDown onBack={handleBackToMenu} />
      </div>
    );
  }

  return null;
}

export default Games;

