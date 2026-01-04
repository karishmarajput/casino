import React, { useState, useEffect, useRef } from 'react';
import adminAxios from '../../utils/axiosConfig';
import { requireAdminAuth } from '../../utils/adminAuth';
import ToastMessage from '../../components/ToastMessage';
import WinnerModal from '../../components/WinnerModal';
import './RollTheBall.css';

function RollTheBall({ onBack }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [entryFee, setEntryFee] = useState('');
  const [currentGame, setCurrentGame] = useState(null);
  const [step, setStep] = useState('entry'); // entry, selectWinner
  const [searchParticipants, setSearchParticipants] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('error');

  const showMessage = (msg, status = 'error') => {
    setMessage(msg);
    setMessageStatus(status);
  };
  const [selectedWinner, setSelectedWinner] = useState('');
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState(null);
  const confettiRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    checkActiveGame();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await adminAxios.get('/api/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const handleGroupSelect = async (groupId) => {
    try {
      const response = await adminAxios.get(`/api/groups/${groupId}`);
      const memberIds = response.data.members.map(m => m.id.toString());
      const newParticipants = [...new Set([...selectedParticipants, ...memberIds])];
      setSelectedParticipants(newParticipants);
      setMessage(`Added ${memberIds.length} member(s) from group`, 'success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to load group members', 'error');
    }
  };

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
      const rollTheBallGame = response.data.find(g => g.game_type === 'rolltheball' && g.status === 'active');
      if (rollTheBallGame) {
        setCurrentGame(rollTheBallGame);
        fetchGameParticipants(rollTheBallGame.id);
        setStep('selectWinner');
      }
    } catch (error) {
    }
  };

  const fetchGameParticipants = async (gameId) => {
    try {
      const response = await adminAxios.get(`/api/games/${gameId}/participants`);
      const userIds = response.data.map(p => p.user_id.toString());
      setSelectedParticipants(userIds);
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
    } else {
      setSelectedParticipants([...selectedParticipants, userIdStr]);
    }
  };

  const handleStartGame = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageStatus('error');
    setLoading(true);

    if (selectedParticipants.length === 0 || !entryFee) {
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
      const participants = selectedParticipants.map(id => ({ userId: parseInt(id) }));

      const response = await adminAxios.post('/api/games/start', {
        entryFee: entryFeeInt,
        participants,
        gameType: 'rolltheball'
      });

      showMessage('Game started successfully! Entry fees deducted and added to pot.', 'success');
      setCurrentGame(response.data.game);
      setEntryFee('');
      setStep('selectWinner');
      fetchUsers();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to start game', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWinner = async () => {
    if (!selectedWinner) {
      showMessage('Please select a winner', 'error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageStatus('error');

    try {
      const response = await adminAxios.post(`/api/games/${currentGame.id}/rolltheball/select-winner`, {
        winnerUserId: parseInt(selectedWinner)
      });

      const winner = users.find(u => u.id.toString() === selectedWinner);
      setWinnerInfo({
        winner: winner,
        potAmount: currentGame.pot_amount
      });

      setShowWinnerModal(true);
      showMessage('Winner selected! Pot distributed successfully.', 'success');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to select winner', 'error');
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
    setSelectedWinner('');
    setEntryFee('');
    setWinnerInfo(null);
    fetchUsers();
  };

  if (step === 'entry') {
    return (
      <div className="rolltheball-container">
        <div className="rolltheball-card">
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

            {groups.length > 0 && (
              <div className="form-group">
                <label>Select Group (Optional)</label>
                <select
                  className="form-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleGroupSelect(parseInt(e.target.value));
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">Choose a group to add all members...</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.member_count || 0} members)
                    </option>
                  ))}
                </select>
              </div>
            )}

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

  if (step === 'selectWinner') {
    const availableWinners = users.filter(u => selectedParticipants.includes(u.id.toString()));

    return (
      <div className="rolltheball-container">
        <div className="rolltheball-card">
          <h3 className="rolltheball-title">⚽ Select Winner</h3>

          {currentGame && (
            <div className="pot-display">
              <div className="pot-label">💰</div>
              <div className="pot-amount">${parseInt(currentGame.pot_amount || 0)}</div>
            </div>
          )}

          <div className="form-group">
            <label>Select Winner</label>
            <select
              value={selectedWinner}
              onChange={(e) => setSelectedWinner(e.target.value)}
              className="winner-select"
              required
            >
              <option value="">Choose a winner...</option>
              {availableWinners.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
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
              amount: Math.round(parseFloat(winnerInfo.potAmount) * 100) / 100 // Round to 2 decimal places for display
            }] : []}
            title="🎉 WINNER! 🎉"
            playSoundOnOpen={true}
          />

          <div className="button-group">
            <button
              onClick={handleSelectWinner}
              disabled={loading || !selectedWinner}
              className="submit-btn"
            >
              {loading ? 'Selecting Winner...' : 'Select Winner & Distribute Pot'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default RollTheBall;

