import React, { useState, useEffect, useRef } from 'react';
import adminAxios from '../../utils/axiosConfig';
import { requireAdminAuth } from '../../utils/adminAuth';
import ToastMessage from '../../components/ToastMessage';
import spinningSound from '../../assets/spinning.mp3';
import spinWinSound from '../../assets/spin-win-sound.mp3';
import failureSound from '../../assets/failure-sound.mp3';
import winnerSound from '../../assets/winner-sound.mp3';
import './DealNoDeal.css';

function DealNoDeal({ onBack }) {
  const [users, setUsers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [step, setStep] = useState('entry');
  const [searchParticipants, setSearchParticipants] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('error');

  const showMessage = (msg, status = 'error') => {
    setMessage(msg);
    setMessageStatus(status);
  };
  
  const [wheelParticipants, setWheelParticipants] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSpinResult, setCurrentSpinResult] = useState(null);
  const [showAmountForm, setShowAmountForm] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [pendingWinner, setPendingWinner] = useState(null);
  const [showGameCompletedModal, setShowGameCompletedModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionInfo, setTransactionInfo] = useState(null);
  const wheelRef = useRef(null);
  const spinSoundRef = useRef(null);
  const winSoundRef = useRef(null);
  const failureSoundRef = useRef(null);
  const winnerSoundRef = useRef(null);
  const [amountFormData, setAmountFormData] = useState({
    playerId: '',
    operation: 'add',
    amount: ''
  });

  useEffect(() => {
    fetchUsers();
    spinSoundRef.current = new Audio(spinningSound);
    spinSoundRef.current.loop = false;
    spinSoundRef.current.volume = 0.7;
    
    winSoundRef.current = new Audio(spinWinSound);
    winSoundRef.current.volume = 0.7;
    
    failureSoundRef.current = new Audio(failureSound);
    failureSoundRef.current.volume = 0.7;
    
    winnerSoundRef.current = new Audio(winnerSound);
    winnerSoundRef.current.volume = 0.7;
    
    return () => {
      if (spinSoundRef.current) {
        spinSoundRef.current.pause();
        spinSoundRef.current = null;
      }
      if (winSoundRef.current) {
        winSoundRef.current.pause();
        winSoundRef.current = null;
      }
      if (failureSoundRef.current) {
        failureSoundRef.current.pause();
        failureSoundRef.current = null;
      }
      if (winnerSoundRef.current) {
        winnerSoundRef.current.pause();
        winnerSoundRef.current = null;
      }
    };
  }, []);

  const handleWheelStop = React.useCallback((selectedPlayer) => {
    setCurrentSpinResult(selectedPlayer);
    setPendingWinner(selectedPlayer);
    setShowWinnerModal(true);
    setIsSpinning(false);
    
    // Play win sound when modal opens
    if (winSoundRef.current) {
      winSoundRef.current.currentTime = 0;
      winSoundRef.current.play().catch(err => {
        console.error('Error playing win sound:', err);
      });
    }
  }, []);

  const handleCloseWinnerModal = React.useCallback(() => {
    // Stop win sound when modal closes
    if (winSoundRef.current) {
      winSoundRef.current.pause();
      winSoundRef.current.currentTime = 0;
    }
    
    if (pendingWinner) {
      setSelectedPlayers(prev => {
        const newSelectedPlayers = [...prev, pendingWinner];
        if (newSelectedPlayers.length === 2) {
          setShowAmountForm(true);
          setAmountFormData({
            playerId: newSelectedPlayers[0].id.toString(),
            operation: 'add',
            amount: ''
          });
        }
        if (newSelectedPlayers.length === 1 && wheelParticipants.length === 1) {
          setShowAmountForm(true);
          setAmountFormData({
            playerId: newSelectedPlayers[0].id.toString(),
            operation: 'add',
            amount: ''
          });
        }
        
        return newSelectedPlayers;
      });
      setWheelParticipants(prev => prev.filter(p => p.id !== pendingWinner.id));
    }
    setShowWinnerModal(false);
    setPendingWinner(null);
  }, [pendingWinner, wheelParticipants.length]);

  // Auto-close winner modal after 10 seconds
  useEffect(() => {
    if (showWinnerModal && pendingWinner) {
      const timer = setTimeout(() => {
        handleCloseWinnerModal();
      }, 10000); // 10 seconds

      return () => {
        clearTimeout(timer);
      };
    }
  }, [showWinnerModal, pendingWinner, handleCloseWinnerModal]);

  useEffect(() => {
    if (step === 'game' && wheelParticipants.length > 0 && wheelRef.current) {
      const canvas = wheelRef.current;
      const ctx = canvas.getContext('2d');
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 20;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const colors = [
        '#d4af37', '#4ade80', '#3b82f6', '#a855f7',
        '#ec4899', '#fb923c', '#22c55e', '#6366f1',
      ];
      
      const segmentAngle = (2 * Math.PI) / wheelParticipants.length;
      const fontSize = Math.max(12, Math.min(20, 400 / wheelParticipants.length));
      wheelParticipants.forEach((participant, index) => {
        const startAngle = index * segmentAngle - Math.PI / 2;
        const endAngle = (index + 1) * segmentAngle - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.stroke();
        const textAngle = startAngle + segmentAngle / 2;
        const textRadius = radius * 0.75;
        const textX = centerX + Math.cos(textAngle) * textRadius;
        const textY = centerY + Math.sin(textAngle) * textRadius;
        
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(textAngle + Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        if (participant.name.includes(' ')) {
          const words = participant.name.split(' ');
          const lineHeight = fontSize * 1.2;
          const totalHeight = (words.length - 1) * lineHeight;
          const startY = -totalHeight / 2;
          
          words.forEach((word, wordIndex) => {
            const y = startY + (wordIndex * lineHeight);
            ctx.strokeText(word, 0, y);
            ctx.fillText(word, 0, y);
          });
        } else {
          ctx.strokeText(participant.name, 0, 0);
          ctx.fillText(participant.name, 0, 0);
        }
        
        ctx.restore();
      });
    }
  }, [wheelParticipants, step]);

  const fetchUsers = async () => {
    try {
      const response = await adminAxios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
    }
  };

  const filteredUsers = searchParticipants === ''
    ? users.filter(u => !selectedParticipants.includes(u.id.toString()))
    : users.filter(u => 
        !selectedParticipants.includes(u.id.toString()) &&
        u.name.toLowerCase().includes(searchParticipants.toLowerCase())
      );

  const allFilteredUsersSelected = filteredUsers.length > 0 && 
    filteredUsers.every(user => 
      selectedParticipants.includes(user.id.toString())
    );

  const handleSelectAll = () => {
    if (allFilteredUsersSelected) {
      setSelectedParticipants(selectedParticipants.filter(id => 
        !filteredUsers.some(user => user.id.toString() === id)
      ));
    } else {
      const filteredUserIds = filteredUsers.map(user => user.id.toString());
      setSelectedParticipants([...new Set([...selectedParticipants, ...filteredUserIds])]);
    }
  };

  const handleParticipantToggle = (userId) => {
    const userIdStr = userId.toString();
    if (selectedParticipants.includes(userIdStr)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== userIdStr));
    } else {
      setSelectedParticipants([...selectedParticipants, userIdStr]);
    }
  };

  const handleStartGame = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageStatus('error');
    setLoading(true);

    if (selectedParticipants.length === 0) {
      showMessage('Please select at least one participant', 'error');
      setLoading(false);
      return;
    }

    try {
      const participantUsers = users.filter(u => selectedParticipants.includes(u.id.toString()));
      setWheelParticipants(participantUsers);
      setSelectedPlayers([]);
      setCurrentSpinResult(null);
      setShowAmountForm(false);
      setStep('game');
      showMessage('Game started! Click Spin to select a player.', 'success');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to start game', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSpin = () => {
    if (wheelParticipants.length === 0) {
      showMessage('No participants available in the wheel', 'error');
      return;
    }

    if (isSpinning) return;

    setIsSpinning(true);
    setMessage('');
    setMessageStatus('error');
    setCurrentSpinResult(null);
    const randomIndex = Math.floor(Math.random() * wheelParticipants.length);
    const selectedParticipant = wheelParticipants[randomIndex];
    const canvas = wheelRef.current;
    if (!canvas) return;
    
    const segmentAngle = 360 / wheelParticipants.length;
    const segmentCenterCanvas = -90 + randomIndex * segmentAngle + (segmentAngle / 2);
    let targetAngle = -90 - segmentCenterCanvas;
    targetAngle = ((targetAngle % 360) + 360) % 360;
    
    const fullRotations = 5;
    const totalRotation = fullRotations * 360 + targetAngle;
    
    let currentRotation = 0;
    const startTime = Date.now();
    const duration = 3000;
    
    // Play spinning sound - will loop and stop exactly when animation completes
    if (spinSoundRef.current) {
      spinSoundRef.current.currentTime = 0;
      spinSoundRef.current.play().catch(err => {
        console.error('Error playing spin sound:', err);
      });
      
      // Stop audio exactly when animation completes (3000ms)
      setTimeout(() => {
        if (spinSoundRef.current) {
          spinSoundRef.current.pause();
          spinSoundRef.current.currentTime = 0;
        }
      }, duration);
    }
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      currentRotation = totalRotation * easeOut;
      const ctx = canvas.getContext('2d');
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 20;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((currentRotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
      const colors = [
        '#d4af37', '#4ade80', '#3b82f6', '#a855f7',
        '#ec4899', '#fb923c', '#22c55e', '#6366f1',
      ];
      
      const segmentAngleRad = (2 * Math.PI) / wheelParticipants.length;
      const fontSize = Math.max(12, Math.min(20, 400 / wheelParticipants.length));
      wheelParticipants.forEach((participant, index) => {
        const startAngle = index * segmentAngleRad - Math.PI / 2;
        const endAngle = (index + 1) * segmentAngleRad - Math.PI / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.stroke();
        const textAngle = startAngle + segmentAngleRad / 2;
        const textRadius = radius * 0.75;
        const textX = centerX + Math.cos(textAngle) * textRadius;
        const textY = centerY + Math.sin(textAngle) * textRadius;
        
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(textAngle + Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        if (participant.name.includes(' ')) {
          const words = participant.name.split(' ');
          const lineHeight = fontSize * 1.2;
          const totalHeight = (words.length - 1) * lineHeight;
          const startY = -totalHeight / 2;
          
          words.forEach((word, wordIndex) => {
            const y = startY + (wordIndex * lineHeight);
            ctx.strokeText(word, 0, y);
            ctx.fillText(word, 0, y);
          });
        } else {
          ctx.strokeText(participant.name, 0, 0);
          ctx.fillText(participant.name, 0, 0);
        }
        
        ctx.restore();
      });
      
      ctx.restore();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const finalRotationDeg = currentRotation % 360;
        const normalizedRotation = ((finalRotationDeg % 360) + 360) % 360;
        let closestIndex = 0;
        let minDistance = Infinity;
        const pointerAngle1 = -90;
        const pointerAngle2 = 270;
        
        for (let i = 0; i < wheelParticipants.length; i++) {
          const originalCenter = -90 + i * segmentAngle + (segmentAngle / 2);
          const rotatedCenter = originalCenter + normalizedRotation;
          const normalizedCenter = ((rotatedCenter % 360) + 360) % 360;
          const dist1 = Math.abs(normalizedCenter - ((pointerAngle1 % 360) + 360) % 360);
          const dist2 = Math.abs(normalizedCenter - pointerAngle2);
          const distance = Math.min(dist1, dist2, 360 - dist1, 360 - dist2);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
          }
        }
        
        const selectedPlayer = wheelParticipants[closestIndex];
        setCurrentSpinResult(selectedPlayer);
        
        // Stop spinning sound
        if (spinSoundRef.current) {
          spinSoundRef.current.pause();
          spinSoundRef.current.currentTime = 0;
        }
        
        handleWheelStop(selectedPlayer);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const handleAmountFormChange = (field, value) => {
    setAmountFormData({
      ...amountFormData,
      [field]: value
    });
  };

  const handleApplyAmount = async () => {
    if (!amountFormData.playerId || !amountFormData.amount) {
      showMessage('Please select a player and enter an amount', 'error');
      return;
    }

    const amount = parseInt(amountFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      showMessage('Please enter a valid amount', 'error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageStatus('error');

    try {
      const playerId = parseInt(amountFormData.playerId);
      const isDeduct = amountFormData.operation === 'deduct';
      const response = await adminAxios.post('/api/users/update-balance', {
        userId: playerId,
        amount: isDeduct ? -amount : amount,
        gameType: 'dealnodeal'
      });

      const playerName = users.find(u => u.id === playerId)?.name;
      showMessage(`${isDeduct ? 'Deducted' : 'Added'} $${amount.toFixed(2)} ${isDeduct ? 'from' : 'to'} ${playerName}`, 'success');
      
      // Play appropriate sound and show modal based on operation
      if (isDeduct) {
        // Play failure sound when money is deducted
        if (failureSoundRef.current) {
          failureSoundRef.current.currentTime = 0;
          failureSoundRef.current.play().catch(err => {
            console.error('Error playing failure sound:', err);
          });
        }
        // Show transaction modal in red
        setTransactionInfo({
          name: playerName,
          amount: amount,
          isWinner: false
        });
        setShowTransactionModal(true);
      } else {
        // Play winner sound when money is added
        if (winnerSoundRef.current) {
          winnerSoundRef.current.currentTime = 0;
          winnerSoundRef.current.play().catch(err => {
            console.error('Error playing winner sound:', err);
          });
        }
        // Show transaction modal in green as winner
        setTransactionInfo({
          name: playerName,
          amount: amount,
          isWinner: true
        });
        setShowTransactionModal(true);
      }

      const otherPlayer = selectedPlayers.find(p => p.id.toString() !== amountFormData.playerId);
      if (otherPlayer) {
        setWheelParticipants(prev => {
          if (!prev.find(p => p.id === otherPlayer.id)) {
            return [...prev, otherPlayer];
          }
          return prev;
        });
      }

      const isLastTransaction = selectedPlayers.length === 1 && wheelParticipants.length === 0;
      setSelectedPlayers([]);
      setCurrentSpinResult(null);
      setShowAmountForm(false);
      setAmountFormData({
        playerId: '',
        operation: 'add',
        amount: ''
      });

      if (isLastTransaction) {
        setTimeout(() => {
          setShowGameCompletedModal(true);
        }, 500);
      }

      fetchUsers();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to update balance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetGame = () => {
    const participantUsers = users.filter(u => selectedParticipants.includes(u.id.toString()));
    setWheelParticipants(participantUsers);
    setSelectedPlayers([]);
    setCurrentSpinResult(null);
    setShowAmountForm(false);
    setAmountFormData({
      playerId: '',
      operation: 'add',
      amount: ''
    });
    showMessage('Game reset!', 'success');
  };

  const handleGameCompleted = () => {
    setStep('entry');
    setWheelParticipants([]);
    setSelectedPlayers([]);
    setCurrentSpinResult(null);
    setShowAmountForm(false);
    setShowGameCompletedModal(false);
    setSelectedParticipants([]);
    setAmountFormData({
      playerId: '',
      operation: 'add',
      amount: ''
    });
    setMessage('');
    setMessageStatus('error');
  };

  if (step === 'entry') {
    return (
      <div className="dealnodeal-container">
        <div className="dealnodeal-card dealnodeal-game-entry-card">
          <form onSubmit={handleStartGame}>
            <div className={`form-group ${showDropdown ? 'dropdown-active' : ''}`}>
              <label>Select Participants</label>
              <div className="dropdown-container">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchParticipants}
                  onChange={(e) => setSearchParticipants(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  className="search-input"
                />
                {showDropdown && filteredUsers.length > 0 && (
                  <div className="dropdown">
                    {filteredUsers.length > 0 && (
                      <div
                        className="dropdown-item select-all-item"
                        onClick={handleSelectAll}
                      >
                        <input
                          type="checkbox"
                          checked={allFilteredUsersSelected}
                          onChange={handleSelectAll}
                          onClick={(e) => e.stopPropagation()}
                          className="checkbox-input"
                        />
                        <span className="select-all-text">Select All</span>
                      </div>
                    )}
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="dropdown-item"
                        onClick={() => handleParticipantToggle(user.id)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(user.id.toString())}
                          onChange={() => handleParticipantToggle(user.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="checkbox-input"
                        />
                        <span>
                          {user.name} (${parseInt(user.balance)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedParticipants.length > 0 && (
                <div className="selected-users">
                  <div className="selected-users-label">Selected ({selectedParticipants.length}):</div>
                  <div className="selected-users-list">
                    {selectedParticipants.map((userId) => {
                      const user = users.find(u => u.id.toString() === userId);
                      return user ? (
                        <span
                          key={userId}
                          className="selected-user-tag"
                          onClick={() => handleParticipantToggle(userId)}
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

            <button type="submit" disabled={loading || selectedParticipants.length === 0} className="submit-btn">
              {loading ? 'Starting Game...' : 'Start Game'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'game') {
    const selectedPlayerUsers = selectedPlayers.map(p => users.find(u => u.id === p.id)).filter(Boolean);

    return (
      <div className="dealnodeal-container">
        <div className="dealnodeal-card">
        <div className="wheel-participants-count">
              <span className="info-label">Players:</span>
              <span className="info-value">{wheelParticipants.length}</span>
            </div>

          <div className="game-content-wrapper">
            <div className="spin-wheel-section">
              <div className="wheel-container">
                <div className="wheel-pointer"></div>
                {wheelParticipants.length > 0 ? (
                  <>
                    <canvas 
                      ref={wheelRef}
                      width="800" 
                      height="800"
                      className="wheel-canvas"
                    ></canvas>
                    <button
                      onClick={handleSpin}
                      disabled={isSpinning || wheelParticipants.length === 0 || selectedPlayers.length >= 2}
                      className="spin-btn-center"
                    >
                      {isSpinning ? 'Spinning...' : 'Spin'}
                    </button>
                  </>
                ) : (
                  <div className="wheel-empty">No participants available</div>
                )}
              </div>
            </div>

            <div className="results-section">
              {selectedPlayers.length > 0 && (
                <div className="selected-players-section">
                  <h4 className="section-title">Selected Players:</h4>
                  <div className="selected-players-list">
                    {selectedPlayerUsers.map((player, index) => (
                      <div key={player.id} className="selected-player-card">
                        <div className="player-name">{player.name}</div>
                        <div className="player-balance">${parseInt(player.balance)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showAmountForm && selectedPlayers.length > 0 && (
                <div className="amount-form-section">
                  <h4 className="section-title">Add or Deduct Amount</h4>
                  <div className="amount-form">
                    <div className="form-row">
                      <label>Select Player:</label>
                      <select
                        value={amountFormData.playerId}
                        onChange={(e) => handleAmountFormChange('playerId', e.target.value)}
                        className="form-select"
                      >
                        <option value="">Choose a player...</option>
                        {selectedPlayerUsers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-row">
                      <label>Operation:</label>
                      <select
                        value={amountFormData.operation}
                        onChange={(e) => handleAmountFormChange('operation', e.target.value)}
                        className="form-select"
                      >
                        <option value="add">Add</option>
                        <option value="deduct">Deduct</option>
                      </select>
                    </div>

                    <div className="form-row">
                      <label>Amount:</label>
                      <input
                        type="text"
                        value={amountFormData.amount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            handleAmountFormChange('amount', value);
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
                        placeholder="Enter amount"
                        className="form-input"
                      />
                    </div>

                    <button
                      onClick={handleApplyAmount}
                      disabled={loading || !amountFormData.playerId || !amountFormData.amount}
                      className="apply-btn"
                    >
                      {loading ? 'Processing...' : 'Apply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <ToastMessage
            message={message}
            status={messageStatus}
            onClose={() => { setMessage(''); setMessageStatus('error'); }}
          />

          {showWinnerModal && pendingWinner && (
            <div className="winner-modal-overlay" onClick={handleCloseWinnerModal}>
              <div className="winner-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="winner-modal-title">Selected</h2>
                <div className="winner-modal-content">
                  <div className="winner-name-large">{pendingWinner.name}</div>
                </div>
                <button 
                  onClick={handleCloseWinnerModal}
                  className="winner-modal-btn"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {showGameCompletedModal && (
            <div className="winner-modal-overlay" onClick={handleGameCompleted}>
              <div className="winner-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="winner-modal-title">🎊 Game Over! 🎊</h2>
                <div className="winner-modal-content">
                  <p style={{ color: '#d4af37', fontSize: '1.2rem', marginTop: '1rem' }}>
                    Thank you for playing!
                  </p>
                </div>
                <button 
                  onClick={handleGameCompleted}
                  className="winner-modal-btn"
                >
                  Start New Game
                </button>
              </div>
            </div>
          )}

          {showTransactionModal && transactionInfo && (
            <div 
              className="winner-modal-overlay" 
              onClick={() => {
                // Stop sounds when closing modal
                if (failureSoundRef.current) {
                  failureSoundRef.current.pause();
                  failureSoundRef.current.currentTime = 0;
                }
                if (winnerSoundRef.current) {
                  winnerSoundRef.current.pause();
                  winnerSoundRef.current.currentTime = 0;
                }
                setShowTransactionModal(false);
                setTransactionInfo(null);
              }}
            >
              <div 
                className={`winner-modal transaction-modal ${transactionInfo.isWinner ? 'transaction-winner' : 'transaction-deduct'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 
                  className="winner-modal-title"
                  style={{ 
                    color: transactionInfo.isWinner ? '#22c55e' : '#ef4444',
                    textShadow: transactionInfo.isWinner 
                      ? '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px rgba(34, 197, 94, 0.5)' 
                      : '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px rgba(239, 68, 68, 0.5)'
                  }}
                >
                  {transactionInfo.isWinner ? '🎉 Winner! 🎉' : '💸 Deducted'}
                </h2>
                <div className="winner-modal-content">
                  <div 
                    className="winner-name-large"
                    style={{ 
                      color: transactionInfo.isWinner ? '#22c55e' : '#ef4444',
                      fontSize: '2rem',
                      fontWeight: '700'
                    }}
                  >
                    {transactionInfo.name}
                  </div>
                  <div 
                    style={{ 
                      color: transactionInfo.isWinner ? '#22c55e' : '#ef4444',
                      fontSize: '1.5rem',
                      marginTop: '1rem',
                      fontWeight: '600'
                    }}
                  >
                    ${transactionInfo.amount.toFixed(2)}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    // Stop sounds when closing modal
                    if (failureSoundRef.current) {
                      failureSoundRef.current.pause();
                      failureSoundRef.current.currentTime = 0;
                    }
                    if (winnerSoundRef.current) {
                      winnerSoundRef.current.pause();
                      winnerSoundRef.current.currentTime = 0;
                    }
                    setShowTransactionModal(false);
                    setTransactionInfo(null);
                  }}
                  className="winner-modal-btn"
                  style={{
                    background: transactionInfo.isWinner 
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                      : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    borderColor: transactionInfo.isWinner ? '#22c55e' : '#ef4444'
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          )}

          <div className="game-actions">
            <button onClick={handleResetGame} className="reset-btn">
              Reset Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default DealNoDeal;

