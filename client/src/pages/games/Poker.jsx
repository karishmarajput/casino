import React, { useState, useEffect, useRef } from 'react';
import adminAxios from '../../utils/axiosConfig';
import ToastMessage from '../../components/ToastMessage';
import WinnerModal from '../../components/WinnerModal';
import './Poker.css';

function Poker({ onBack }) {
  const [users, setUsers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [chipAmount, setChipAmount] = useState('');
  const [currentGame, setCurrentGame] = useState(null);
  const [step, setStep] = useState('entry'); // entry, distribute
  const [searchParticipants, setSearchParticipants] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('error');

  const showMessage = (msg, status = 'error') => {
    setMessage(msg);
    setMessageStatus(status);
  };
  const [participantAmounts, setParticipantAmounts] = useState({});
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState(null);
  const confettiRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    checkActiveGame();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminAxios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
    }
  };

  const checkActiveGame = async () => {
    try {
      const response = await adminAxios.get('/api/games');
      const pokerGame = response.data.find(g => g.game_type === 'poker' && g.status === 'active');
      if (pokerGame) {
        setCurrentGame(pokerGame);
        fetchGameParticipants(pokerGame.id);
        setStep('distribute');
      }
    } catch (error) {
    }
  };

  const fetchGameParticipants = async (gameId) => {
    try {
      const response = await adminAxios.get(`/api/games/${gameId}/participants`);
      const userIds = response.data.map(p => p.user_id.toString());
      setSelectedParticipants(userIds);
      
      // Initialize participant amounts to 0
      const amounts = {};
      userIds.forEach(userId => {
        amounts[userId] = '';
      });
      setParticipantAmounts(amounts);
    } catch (error) {
    }
  };

  const filteredUsers = searchParticipants === ''
    ? users.filter(u => !selectedParticipants.includes(u.id.toString()))
    : users.filter(u => 
        !selectedParticipants.includes(u.id.toString()) &&
        u.name.toLowerCase().includes(searchParticipants.toLowerCase())
      );

  const handleParticipantToggle = (userId) => {
    const userIdStr = userId.toString();
    if (selectedParticipants.includes(userIdStr)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== userIdStr));
      // Remove from amounts
      const newAmounts = { ...participantAmounts };
      delete newAmounts[userIdStr];
      setParticipantAmounts(newAmounts);
    } else {
      setSelectedParticipants([...selectedParticipants, userIdStr]);
      // Add to amounts with empty value
      setParticipantAmounts({ ...participantAmounts, [userIdStr]: '' });
    }
  };

  const handleStartGame = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageStatus('error');
    setLoading(true);

    if (selectedParticipants.length === 0 || !chipAmount) {
      showMessage('Please select participants and enter chip amount', 'error');
      setLoading(false);
      return;
    }

    const chipAmountInt = parseInt(chipAmount);
    if (isNaN(chipAmountInt) || chipAmountInt <= 0) {
      showMessage('Chip amount must be a positive number', 'error');
      setLoading(false);
      return;
    }

    try {
      const participants = selectedParticipants.map(id => ({ userId: parseInt(id) }));

      const response = await adminAxios.post('/api/games/start', {
        entryFee: chipAmountInt,
        participants,
        gameType: 'poker'
      });

      showMessage('Game started successfully! Chip amounts deducted and added to pot.', 'success');
      setCurrentGame(response.data.game);
      setChipAmount('');
      setStep('distribute');
      fetchUsers();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to start game', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (userId, value) => {
    if (value === '' || /^\d+$/.test(value)) {
      setParticipantAmounts({
        ...participantAmounts,
        [userId]: value
      });
    }
  };

  const calculateTotal = () => {
    return Object.values(participantAmounts).reduce((sum, amount) => {
      return sum + (parseInt(amount) || 0);
    }, 0);
  };

  const handleDistributePot = async () => {
    setMessage('');
    setMessageStatus('error');
    setLoading(true);

    const participantsWithAmounts = selectedParticipants.filter(userId => {
      const amount = participantAmounts[userId];
      return amount && parseInt(amount) > 0;
    });

    if (participantsWithAmounts.length === 0) {
      showMessage('Please enter amounts for at least one participant', 'error');
      setLoading(false);
      return;
    }

    const totalAmount = calculateTotal();
    const potAmount = parseInt(currentGame.pot_amount || 0);

    if (totalAmount !== potAmount) {
      showMessage(`Total amount ($${totalAmount}) must equal pot amount ($${potAmount})`, 'error');
      setLoading(false);
      return;
    }

    try {
      const distribution = selectedParticipants.map(userId => ({
        userId: parseInt(userId),
        amount: parseInt(participantAmounts[userId] || 0)
      })).filter(d => d.amount > 0);

      const response = await adminAxios.post(`/api/games/${currentGame.id}/poker/distribute`, {
        distribution
      });

      const winnerData = distribution.reduce((max, curr) => 
        curr.amount > max.amount ? curr : max
      );
      const winner = users.find(u => u.id === winnerData.userId);

      setWinnerInfo({
        winner: winner,
        potAmount: potAmount,
        distribution: distribution
      });

      setShowWinnerModal(true);
      showMessage('Pot distributed successfully!', 'success');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to distribute pot', 'error');
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

  const handleCloseWinnerModal = () => {
    setShowWinnerModal(false);
    setCurrentGame(null);
    setStep('entry');
    setSelectedParticipants([]);
    setParticipantAmounts({});
    setChipAmount('');
    setWinnerInfo(null);
    fetchUsers();
  };

  if (step === 'entry') {
    return (
      <div className="poker-container">
        <div className="poker-card">
          <form onSubmit={handleStartGame}>
            <div className="form-group">
              <label>Chip Amount</label>
              <input
                type="text"
                value={chipAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d+$/.test(value)) {
                    setChipAmount(value);
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
                placeholder="Enter chip amount"
                required
              />
            </div>

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

            {message && (
              <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading || selectedParticipants.length === 0} className="submit-btn">
              {loading ? 'Starting Game...' : 'Start Game'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'distribute') {
    const totalAmount = calculateTotal();
    const potAmount = parseInt(currentGame?.pot_amount || 0);
    const isValid = totalAmount === potAmount;
    const participantUsers = users.filter(u => selectedParticipants.includes(u.id.toString()));

    return (
      <div className="poker-container">
        <div className="poker-card">
          <h3 className="poker-title">🃏 Distribute Pot</h3>

          {currentGame && (
            <div className="pot-display">
              <div className="pot-label">💰</div>
              <div className="pot-amount">${potAmount}</div>
            </div>
          )}

          <div className="distribution-section">
            <h4 className="distribution-title">Enter Amounts for Each Participant</h4>
            
            <div className="participants-amounts-list">
              {participantUsers.map((user) => (
                <div key={user.id} className="participant-amount-row">
                  <div className="participant-name">{user.name}</div>
                  <div className="amount-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="text"
                      value={participantAmounts[user.id.toString()] || ''}
                      onChange={(e) => handleAmountChange(user.id.toString(), e.target.value)}
                      placeholder="0"
                      className="amount-input"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="total-display">
              <div className="total-label">Total:</div>
              <div className={`total-amount ${isValid ? 'valid' : 'invalid'}`}>
                ${totalAmount}
              </div>
            </div>

            {!isValid && totalAmount > 0 && (
              <div className="validation-message">
                Total amount must equal pot amount (${potAmount})
              </div>
            )}
          </div>

            <ToastMessage
              message={message}
              status={messageStatus}
              onClose={() => { setMessage(''); setMessageStatus('error'); }}
            />

          <WinnerModal
            isOpen={showWinnerModal && winnerInfo !== null}
            onClose={handleCloseWinnerModal}
            winners={winnerInfo ? [{
              name: winnerInfo.winner.name,
              amount: winnerInfo.distribution.find(d => d.userId === winnerInfo.winner.id)?.amount || 0
            }] : []}
            title="🎉 WINNER! 🎉"
            playSoundOnOpen={true}
          />

          <div className="button-group">
            <button
              onClick={handleDistributePot}
              disabled={loading || !isValid || totalAmount === 0}
              className="submit-btn"
            >
              {loading ? 'Distributing...' : 'Distribute Pot'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default Poker;

