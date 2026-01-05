import React, { useState, useEffect, useRef } from 'react';
import adminAxios from '../../utils/axiosConfig';
import { requireAdminAuth } from '../../utils/adminAuth';
import ToastMessage from '../../components/ToastMessage';
import WinnerModal from '../../components/WinnerModal';
import './SevenUpSevenDown.css';

function SevenUpSevenDown({ onBack }) {
  const [users, setUsers] = useState([]);
  const [selectedUpUsers, setSelectedUpUsers] = useState([]);
  const [selectedDownUsers, setSelectedDownUsers] = useState([]);
  const [entryFee, setEntryFee] = useState('');
  const [currentGame, setCurrentGame] = useState(null);
  const [games, setGames] = useState([]);
  const [searchUp, setSearchUp] = useState('');
  const [searchDown, setSearchDown] = useState('');
  const [showUpDropdown, setShowUpDropdown] = useState(false);
  const [showDownDropdown, setShowDownDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('error');
  const [winner, setWinner] = useState('');
  const [showWinners, setShowWinners] = useState(null);
  const confettiRef = useRef(null);

  const showMessage = (msg, status = 'error') => {
    setMessage(msg);
    setMessageStatus(status);
  };

  useEffect(() => {
    if (!requireAdminAuth()) return;
    fetchUsers();
    fetchGames();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminAxios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
    }
  };

  const fetchGames = async () => {
    try {
      const response = await adminAxios.get('/api/games');
      const sevenUpGames = response.data.filter(g => g.game_type === '7up7down');
      setGames(sevenUpGames);
      const activeGame = sevenUpGames.find(g => g.status === 'active');
      if (activeGame) {
        setCurrentGame(activeGame);
        fetchGameParticipants(activeGame.id);
      }
    } catch (error) {
    }
  };

  const fetchGameParticipants = async (gameId) => {
    try {
      const response = await adminAxios.get(`/api/games/${gameId}/participants`);
      const participants = response.data;
      const upUsers = participants.filter(p => p.choice === 'up').map(p => p.user_id.toString());
      const downUsers = participants.filter(p => p.choice === 'down').map(p => p.user_id.toString());
      setSelectedUpUsers(upUsers);
      setSelectedDownUsers(downUsers);
    } catch (error) {
    }
  };

  const filteredUsersUp = (searchUp === ''
    ? users
    : users.filter(user =>
        user.name.toLowerCase().includes(searchUp.toLowerCase())
      )
  ).filter(user => !selectedDownUsers.includes(user.id.toString()));

  const filteredUsersDown = (searchDown === ''
    ? users
    : users.filter(user =>
        user.name.toLowerCase().includes(searchDown.toLowerCase())
      )
  ).filter(user => !selectedUpUsers.includes(user.id.toString()));

  const allFilteredUsersUpSelected = filteredUsersUp.length > 0 && 
    filteredUsersUp.every(user => 
      selectedUpUsers.includes(user.id.toString())
    );

  const allFilteredUsersDownSelected = filteredUsersDown.length > 0 && 
    filteredUsersDown.every(user => 
      selectedDownUsers.includes(user.id.toString())
    );

  const handleSelectAllUp = () => {
    if (allFilteredUsersUpSelected) {
      setSelectedUpUsers(selectedUpUsers.filter(id => 
        !filteredUsersUp.some(user => user.id.toString() === id)
      ));
    } else {
      const filteredUserIds = filteredUsersUp.map(user => user.id.toString());
      setSelectedUpUsers([...new Set([...selectedUpUsers, ...filteredUserIds])]);
    }
  };

  const handleSelectAllDown = () => {
    if (allFilteredUsersDownSelected) {
      setSelectedDownUsers(selectedDownUsers.filter(id => 
        !filteredUsersDown.some(user => user.id.toString() === id)
      ));
    } else {
      const filteredUserIds = filteredUsersDown.map(user => user.id.toString());
      setSelectedDownUsers([...new Set([...selectedDownUsers, ...filteredUserIds])]);
    }
  };

  const handleUpUserToggle = (userId) => {
    const userIdStr = userId.toString();
    if (selectedUpUsers.includes(userIdStr)) {
      setSelectedUpUsers(selectedUpUsers.filter(id => id !== userIdStr));
    } else {
      setSelectedUpUsers([...selectedUpUsers, userIdStr]);
      setSelectedDownUsers(selectedDownUsers.filter(id => id !== userIdStr));
    }
  };

  const handleDownUserToggle = (userId) => {
    const userIdStr = userId.toString();
    if (selectedDownUsers.includes(userIdStr)) {
      setSelectedDownUsers(selectedDownUsers.filter(id => id !== userIdStr));
    } else {
      setSelectedDownUsers([...selectedDownUsers, userIdStr]);
      setSelectedUpUsers(selectedUpUsers.filter(id => id !== userIdStr));
    }
  };

  const handleStartGame = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageStatus('error');
    setLoading(true);

    if ((selectedUpUsers.length === 0 && selectedDownUsers.length === 0) || !entryFee) {
      showMessage('Please select participants and enter entry fee', 'error');
      setLoading(false);
      return;
    }

    const entryFeeInt = parseInt(entryFee);
    if (isNaN(entryFeeInt) || entryFeeInt <= 0) {
      showMessage('Entry fee must be a positive number', 'error');
      setLoading(false);
      return;
    }

    try {
      const participants = [
        ...selectedUpUsers.map(id => ({ userId: parseInt(id), choice: 'up' })),
        ...selectedDownUsers.map(id => ({ userId: parseInt(id), choice: 'down' }))
      ];

      const response = await adminAxios.post('/api/games/start', {
        entryFee: entryFeeInt,
        participants,
        gameType: '7up7down'
      });

      showMessage('Game started successfully! Entry fees deducted and added to pot.', 'success');
      setCurrentGame(response.data.game);
      setEntryFee('');
      setSelectedUpUsers([]);
      setSelectedDownUsers([]);
      fetchUsers();
      fetchGames();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to start game', 'error');
    } finally {
      setLoading(false);
    }
  };

  const playPartyPopperSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const frequencies = [800, 1000, 1200, 1500];
      
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          const filter = audioContext.createBiquadFilter();
          
          oscillator.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.type = 'square';
          oscillator.frequency.value = freq;
          
          filter.type = 'bandpass';
          filter.frequency.value = freq;
          filter.Q.value = 10;
          
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
        }, index * 30);
      });
    } catch (e) {
    }
  };

  const playApplauseSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const clapCount = 8;
      
      for (let i = 0; i < clapCount; i++) {
        setTimeout(() => {
          const bufferSize = audioContext.sampleRate * 0.1;
          const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
          const data = buffer.getChannelData(0);
          
          for (let j = 0; j < bufferSize; j++) {
            data[j] = Math.random() * 2 - 1;
          }
          
          const noise = audioContext.createBufferSource();
          noise.buffer = buffer;
          
          const gainNode = audioContext.createGain();
          const filter = audioContext.createBiquadFilter();
          
          noise.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          filter.type = 'bandpass';
          filter.frequency.value = 1000 + Math.random() * 500;
          filter.Q.value = 5;
          
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          noise.start(audioContext.currentTime);
          noise.stop(audioContext.currentTime + 0.1);
        }, i * 150);
      }
    } catch (e) {
    }
  };

  const playWinnerSound = () => {
    playPartyPopperSound();
    setTimeout(() => {
      playApplauseSound();
    }, 500);
  };

  const triggerConfetti = () => {
    const confettiContainer = confettiRef.current;
    if (!confettiContainer) return;
    confettiContainer.innerHTML = '';

    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'];
    const particleCount = 150;

    for (let i = 0; i < particleCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-particle';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = '-10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
      confettiContainer.appendChild(confetti);

      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      }, 5000);
    }
  };

  const handleSelectWinner = async () => {
    if (!currentGame || !winner) {
      showMessage('Please select a winner', 'error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageStatus('error');

    try {
      const response = await adminAxios.post(`/api/games/${currentGame.id}/select-winner`, {
        winner: winner
      });

      const winnerUserIds = winner === 'up' ? selectedUpUsers : selectedDownUsers;
      const winnerUsers = users.filter(u => winnerUserIds.includes(u.id.toString()));
      const amountPerWinner = parseFloat(currentGame.pot_amount) / winnerUsers.length;

      setShowWinners({
        winners: winnerUsers,
        amount: Math.round(amountPerWinner * 100) / 100, // Round to 2 decimal places for display
        gameId: currentGame.id
      });

      setTimeout(() => {
        playWinnerSound();
        triggerConfetti();
      }, 300);

      const resetGameState = () => {
        setCurrentGame(null);
        setWinner('');
        setSelectedUpUsers([]);
        setSelectedDownUsers([]);
        setShowWinners(null);
        setEntryFee('');
        setLoading(false);
        setMessage('');
        setMessageStatus('error');
        fetchUsers();
        fetchGames();
      };

      setTimeout(() => {
        resetGameState();
      }, 5000);
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to select winner', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="seven-up-down-container">
      <WinnerModal
        isOpen={showWinners !== null && showWinners.winners && showWinners.winners.length > 0}
        onClose={() => {
          setCurrentGame(null);
          setWinner('');
          setSelectedUpUsers([]);
          setSelectedDownUsers([]);
          setShowWinners(null);
          setEntryFee('');
          setLoading(false);
          setMessage('');
          setMessageStatus('error');
          fetchUsers();
          fetchGames();
        }}
        winners={showWinners ? showWinners.winners.map(winner => ({
          name: winner.name,
          amount: Math.round(showWinners.amount * 100) / 100 // Round to 2 decimal places for display
        })) : []}
        title="🎉 WINNERS! 🎉"
        playSoundOnOpen={true}
        hideBottomButton={true}
      />
      
      <div className="games-layout">
        <div className="games-form-section">
          <div className="games-card">
            {!currentGame ? (
              <form onSubmit={handleStartGame}>
                <div className="form-group">
                  <label>Entry Fee</label>
                  <input
                    type="text"
                    value={entryFee}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setEntryFee(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onWheel={(e) => {
                      e.target.blur();
                    }}
                    placeholder="Enter entry fee"
                    required
                  />
                </div>

                <div className={`form-group ${showUpDropdown ? 'dropdown-active' : ''}`}>
                  <label>7 Up Participants</label>
                  <div className="dropdown-container">
                    <input
                      type="text"
                      placeholder="Search users for 7 Up..."
                      value={searchUp}
                      onChange={(e) => {
                        setSearchUp(e.target.value);
                      }}
                      onFocus={() => setShowUpDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowUpDropdown(false), 200);
                      }}
                      className="search-input"
                    />
                    {showUpDropdown && filteredUsersUp.length > 0 && (
                      <div className="dropdown">
                        {filteredUsersUp.length > 0 && (
                          <div
                            className="dropdown-item select-all-item"
                            onClick={handleSelectAllUp}
                          >
                            <input
                              type="checkbox"
                              checked={allFilteredUsersUpSelected}
                              onChange={handleSelectAllUp}
                              onClick={(e) => e.stopPropagation()}
                              className="checkbox-input"
                            />
                            <span className="select-all-text">Select All</span>
                          </div>
                        )}
                        {filteredUsersUp.map((user) => (
                          <div
                            key={user.id}
                            className="dropdown-item"
                            onClick={() => handleUpUserToggle(user.id)}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUpUsers.includes(user.id.toString())}
                              onChange={() => handleUpUserToggle(user.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="checkbox-input"
                            />
                            <span>
                              {user.name} (₵{parseInt(user.balance)})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedUpUsers.length > 0 && (
                    <div className="selected-users">
                      <div className="selected-users-label">7 Up ({selectedUpUsers.length}):</div>
                      <div className="selected-users-list">
                        {selectedUpUsers.map((userId) => {
                          const user = users.find(u => u.id.toString() === userId);
                          return user ? (
                            <span
                              key={userId}
                              className="selected-user-tag"
                              onClick={() => handleUpUserToggle(userId)}
                            >
                              {user.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className={`form-group ${showDownDropdown ? 'dropdown-active' : ''}`}>
                  <label>7 Down Participants</label>
                  <div className="dropdown-container">
                    <input
                      type="text"
                      placeholder="Search users for 7 Down..."
                      value={searchDown}
                      onChange={(e) => {
                        setSearchDown(e.target.value);
                      }}
                      onFocus={() => setShowDownDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowDownDropdown(false), 200);
                      }}
                      className="search-input"
                    />
                    {showDownDropdown && filteredUsersDown.length > 0 && (
                      <div className="dropdown">
                        {filteredUsersDown.length > 0 && (
                          <div
                            className="dropdown-item select-all-item"
                            onClick={handleSelectAllDown}
                          >
                            <input
                              type="checkbox"
                              checked={allFilteredUsersDownSelected}
                              onChange={handleSelectAllDown}
                              onClick={(e) => e.stopPropagation()}
                              className="checkbox-input"
                            />
                            <span className="select-all-text">Select All</span>
                          </div>
                        )}
                        {filteredUsersDown.map((user) => (
                          <div
                            key={user.id}
                            className="dropdown-item"
                            onClick={() => handleDownUserToggle(user.id)}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDownUsers.includes(user.id.toString())}
                              onChange={() => handleDownUserToggle(user.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="checkbox-input"
                            />
                            <span>
                              {user.name} (₵{parseInt(user.balance)})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedDownUsers.length > 0 && (
                    <div className="selected-users">
                      <div className="selected-users-label">7 Down ({selectedDownUsers.length}):</div>
                      <div className="selected-users-list">
                        {selectedDownUsers.map((userId) => {
                          const user = users.find(u => u.id.toString() === userId);
                          return user ? (
                            <span
                              key={userId}
                              className="selected-user-tag"
                              onClick={() => handleDownUserToggle(userId)}
                            >
                              {user.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <ToastMessage
                  message={message}
                  status={messageStatus}
                  onClose={() => { setMessage(''); setMessageStatus('error'); }}
                />

                <button type="submit" disabled={loading} className="submit-btn">
                  {loading ? 'Starting Game...' : 'Start Game'}
                </button>
              </form>
            ) : (
              <div className="game-active-section">
                <h3 className="game-active-title">Game Active</h3>
                <div className="game-info seven-up-down-info">
                  <p><strong>Entry Fee:</strong> ₵{currentGame.entry_fee}</p>
                  <p><strong>Pot Amount:</strong> ₵{parseInt(currentGame.pot_amount)}</p>
                  <p><strong>7 Up Participants ({selectedUpUsers.length}):</strong></p>
                  <div className="participants-list">
                    {selectedUpUsers.length > 0 ? (
                      selectedUpUsers.map((userId) => {
                        const user = users.find(u => u.id.toString() === userId);
                        return user ? (
                          <span key={userId} className="participant-name">{user.name}</span>
                        ) : null;
                      })
                    ) : (
                      <span className="no-participants">None</span>
                    )}
                  </div>
                  <p><strong>7 Down Participants ({selectedDownUsers.length}):</strong></p>
                  <div className="participants-list">
                    {selectedDownUsers.length > 0 ? (
                      selectedDownUsers.map((userId) => {
                        const user = users.find(u => u.id.toString() === userId);
                        return user ? (
                          <span key={userId} className="participant-name">{user.name}</span>
                        ) : null;
                      })
                    ) : (
                      <span className="no-participants">None</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Select Winner</label>
                  <div className="winner-selection">
                    <button
                      type="button"
                      className={`winner-btn ${winner === 'up' ? 'selected' : ''}`}
                      onClick={() => setWinner('up')}
                    >
                      7 Up
                    </button>
                    <button
                      type="button"
                      className={`winner-btn ${winner === 'down' ? 'selected' : ''}`}
                      onClick={() => setWinner('down')}
                    >
                      7 Down
                    </button>
                  </div>
                </div>

                <ToastMessage
                  message={message}
                  status={messageStatus}
                  onClose={() => { setMessage(''); setMessageStatus('error'); }}
                />

                <button
                  type="button"
                  onClick={handleSelectWinner}
                  disabled={loading || !winner}
                  className="submit-btn"
                >
                  {loading ? 'Processing...' : 'Select Winner & Distribute Pot'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="games-history-section">
          <h3 className="history-title">Game History</h3>
          <div className="games-history">
            {games.length === 0 ? (
              <div className="no-games">No games yet</div>
            ) : (
              games.map((game) => (
                <div key={game.id} className="game-item">
                  <div className="game-main">
                    <div className="game-label">
                      Game #{game.id} - {game.status === 'completed' ? `Winner: ${game.winner === 'up' ? '7 Up' : '7 Down'}` : 'Active'}
                    </div>
                    <div className="game-amount">Pot: ₵{parseInt(game.pot_amount)}</div>
                  </div>
                  <div className="game-details">
                    Entry Fee: ₵{game.entry_fee} | {new Date(game.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SevenUpSevenDown;

