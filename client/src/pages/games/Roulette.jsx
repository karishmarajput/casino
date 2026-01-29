import React, { useState, useEffect, useRef } from 'react';
import adminAxios from '../../utils/axiosConfig';
import { requireAdminAuth } from '../../utils/adminAuth';
import './Roulette.css';
import rouletteIcon from '../../assets/roulette-icon.png';
import ToastMessage from '../../components/ToastMessage';
import WinnerModal from '../../components/WinnerModal';
function Roulette({ onBack }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [entryFee, setEntryFee] = useState('');
  const [currentGame, setCurrentGame] = useState(null);
  const [step, setStep] = useState('entry');
  const [participantNumbers, setParticipantNumbers] = useState({});
  const [spinResult, setSpinResult] = useState(null);
  const [winners, setWinners] = useState([]);
  const [searchParticipants, setSearchParticipants] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('error');

  const showMessage = (msg, status = 'error') => {
    setMessage(msg);
    setMessageStatus(status);
  };
  const [additionalBet, setAdditionalBet] = useState('');
  const [continueParticipants, setContinueParticipants] = useState([]);
  const [manualSpinResult, setManualSpinResult] = useState('');
  const confettiRef = useRef(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [potAlreadyDistributed, setPotAlreadyDistributed] = useState(false);

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

  useEffect(() => {
  }, [step, currentGame, spinResult, winners]);

  // When entering nextRound step, ensure participant numbers are loaded
  useEffect(() => {
    if (step === 'nextRound' && currentGame) {
      const fetchParticipantNumbers = async () => {
        try {
          const participantsResponse = await adminAxios.get(`/api/games/${currentGame.id}/participants`);
          const currentRound = currentGame.round_number || 1;
          // Get participants from the current round (the round we just finished)
          const currentRoundParticipants = participantsResponse.data.filter(p => (p.round_number || 1) === currentRound);
          const numbers = { ...participantNumbers };
          // Populate numbers for all participants from the current round
          currentRoundParticipants.forEach(p => {
            if (p.number !== null && p.number !== undefined) {
              numbers[p.user_id] = p.number;
            }
          });
          setParticipantNumbers(numbers);
        } catch (error) {
          console.error('Error fetching participants for next round:', error);
        }
      };
      fetchParticipantNumbers();
    }
  }, [step, currentGame]);

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
      const rouletteGame = response.data.find(g => g.game_type === 'roulette' && g.status === 'active');
      if (rouletteGame) {
        setCurrentGame(rouletteGame);
        fetchGameParticipants(rouletteGame.id);
        if (rouletteGame.spin_result !== null) {
          checkWinners(rouletteGame.id);
          setStep('spin');
        } else {
          const participants = await adminAxios.get(`/api/games/${rouletteGame.id}/participants`);
          const hasNumbers = participants.data.some(p => p.number !== null);
          setStep(hasNumbers ? 'spin' : 'numbers');
        }
      } else {
        setStep('entry');
      }
    } catch (error) {
    }
  };

  const fetchGameParticipants = async (gameId) => {
    try {
      const response = await adminAxios.get(`/api/games/${gameId}/participants`);
      const gameResponse = await adminAxios.get(`/api/games/${gameId}`);
      const currentRound = gameResponse.data?.round_number || 1;
      const currentRoundParticipants = response.data.filter(p => (p.round_number || 1) === currentRound);
      const userIds = currentRoundParticipants.map(p => p.user_id.toString());
      setSelectedParticipants(userIds);
      const numbers = {};
      currentRoundParticipants.forEach(p => {
        if (p.number !== null) {
          numbers[p.user_id] = p.number;
        }
      });
      setParticipantNumbers(numbers);
      
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
      const newNumbers = { ...participantNumbers };
      delete newNumbers[userId];
      setParticipantNumbers(newNumbers);
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

    const numbersArray = selectedParticipants
      .map(userId => {
        const num = participantNumbers[userId];
        return num !== null && num !== undefined ? { userId: parseInt(userId), number: num } : null;
      })
      .filter(item => item !== null);

    if (numbersArray.length !== selectedParticipants.length) {
      showMessage('Please enter numbers (0-36) for all selected participants', 'error');
      setLoading(false);
      return;
    }

    try {
      const participants = selectedParticipants.map(id => ({ userId: parseInt(id) }));

      const response = await adminAxios.post('/api/games/start', {
        entryFee: entryFeeInt,
        participants,
        gameType: 'roulette'
      });

      const gameId = response.data.game.id;

      await adminAxios.post(`/api/games/${gameId}/roulette/numbers`, {
        participantNumbers: numbersArray
      });

      setCurrentGame(response.data.game);
      setEntryFee('');
      setStep('spin');
      fetchUsers();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to start game', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNumberChange = (userId, number) => {
    const num = number === '' ? null : parseInt(number);
    if (num !== null && (num < 0 || num > 36)) {
      return;
    }
    setParticipantNumbers({ ...participantNumbers, [userId]: num });
  };

  const handleSaveNumbers = async () => {
    setLoading(true);
    setMessage('');
    setMessageStatus('error');

    const numbersArray = Object.entries(participantNumbers)
      .filter(([userId, number]) => selectedParticipants.includes(userId.toString()) && number !== null && number !== undefined)
      .map(([userId, number]) => ({ userId: parseInt(userId), number }));

    if (numbersArray.length !== selectedParticipants.length) {
      showMessage('Please enter numbers for all participants (0-36)', 'error');
      setLoading(false);
      return;
    }

    try {
      await adminAxios.post(`/api/games/${currentGame.id}/roulette/numbers`, {
        participantNumbers: numbersArray
      });
      setStep('spin');
      showMessage('Numbers saved successfully!', 'success');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to save numbers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const rouletteNumbers = [
    { num: 0, color: 'green' },
    { num: 32, color: 'red' },
    { num: 15, color: 'black' },
    { num: 19, color: 'red' },
    { num: 4, color: 'black' },
    { num: 21, color: 'red' },
    { num: 2, color: 'black' },
    { num: 25, color: 'red' },
    { num: 17, color: 'black' },
    { num: 34, color: 'red' },
    { num: 6, color: 'black' },
    { num: 27, color: 'red' },
    { num: 13, color: 'black' },
    { num: 36, color: 'red' },
    { num: 11, color: 'black' },
    { num: 30, color: 'red' },
    { num: 8, color: 'black' },
    { num: 23, color: 'red' },
    { num: 10, color: 'black' },
    { num: 5, color: 'red' },
    { num: 24, color: 'black' },
    { num: 16, color: 'red' },
    { num: 33, color: 'black' },
    { num: 1, color: 'red' },
    { num: 20, color: 'black' },
    { num: 14, color: 'red' },
    { num: 31, color: 'black' },
    { num: 9, color: 'red' },
    { num: 22, color: 'black' },
    { num: 18, color: 'red' },
    { num: 29, color: 'black' },
    { num: 7, color: 'red' },
    { num: 28, color: 'black' },
    { num: 12, color: 'red' },
    { num: 35, color: 'black' },
    { num: 3, color: 'red' },
    { num: 26, color: 'black' }
  ];

  const playSpinSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(80, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(60, audioContext.currentTime + 4);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 2);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 4);
    } catch (e) {
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
          const bufferSize = audioContext.sampleRate * 0.1; // 0.1 seconds
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

  const handleManualSpinResult = async () => {
    const result = parseInt(manualSpinResult);
    if (isNaN(result) || result < 0 || result > 36) {
      showMessage('Please enter a valid number between 0 and 36', 'error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageStatus('error');

    try {
      const response = await adminAxios.post(`/api/games/${currentGame.id}/roulette/spin`, { spinResult: result });
      
      if (response.data.autoWinner) {
        if (currentGame) {
          setCurrentGame({
            ...currentGame,
            pot_amount: response.data.potAmount
          });
        }
        
        setWinners([{ user_id: response.data.winnerUserId }]);
        setPotAlreadyDistributed(true);
        setShowWinnerModal(true);
        setTimeout(() => {
          playWinnerSound();
          triggerConfetti();
        }, 300);
        
        showMessage(response.data.message || 'Only one participant remaining - automatically declared as winner!', 'success');
      } else {
        setSpinResult(response.data.spinResult);
        checkWinners(currentGame.id);
      }
      
      setLoading(false);
      setManualSpinResult('');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to record spin result', 'error');
      setLoading(false);
    }
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

  const checkWinners = async (gameId) => {
    try {
      const response = await adminAxios.get(`/api/games/${gameId}/roulette/winners`);
      const foundWinners = response.data.winners;
      setWinners(foundWinners);
      
      if (foundWinners && foundWinners.length > 0) {
        setShowWinnerModal(true);
        setTimeout(() => {
          playWinnerSound();
          triggerConfetti();
        }, 300);
      }
    } catch (error) {
    }
  };

  const handleDistributePot = async () => {
    setLoading(true);
    setMessage('');
    setMessageStatus('error');

    try {
      await adminAxios.post(`/api/games/${currentGame.id}/roulette/distribute`, {
        winnerUserIds: winners.map(w => w.user_id)
      });
      
      showMessage(`Pot distributed successfully to ${winners.length} winner(s)!`, 'success');
      setPotAlreadyDistributed(true);
      setTimeout(() => {
        setShowWinnerModal(false);
        setCurrentGame(null);
        setStep('entry');
        setSelectedParticipants([]);
        setParticipantNumbers({});
        setSpinResult(null);
        setWinners([]);
        setAdditionalBet('');
        setContinueParticipants([]);
        setPotAlreadyDistributed(false);
        fetchUsers();
        setLoading(false);
      }, 2000);
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to distribute pot', 'error');
      setLoading(false);
    }
  };

  const handleDeclareNearest = async () => {
    setLoading(true);
    setMessage('');
    setMessageStatus('error');

    try {
      const response = await adminAxios.post(`/api/games/${currentGame.id}/roulette/declare-nearest`);
      setWinners(response.data.winners);
      
      if (response.data.winners && response.data.winners.length > 0) {
        setShowWinnerModal(true);
        setTimeout(() => {
          playWinnerSound();
          triggerConfetti();
        }, 300);
      }
      
      showMessage(`Nearest winner(s) found! Distance: ${response.data.distance}. You can now distribute the pot.`, 'success');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to declare nearest winner', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNextRound = async () => {
    setLoading(true);
    setMessage('');
    setMessageStatus('error');

    if (continueParticipants.length === 0 || !additionalBet) {
      showMessage('Please select participants and enter additional bet amount', 'error');
      setLoading(false);
      return;
    }

    const betInt = parseInt(additionalBet);
    if (isNaN(betInt) || betInt <= 0) {
      showMessage('Additional bet must be a positive number', 'error');
      setLoading(false);
      return;
    }

    const numbersArray = continueParticipants
      .map(userId => {
        const num = participantNumbers[userId];
        return num !== null && num !== undefined ? { userId: parseInt(userId), number: num } : null;
      })
      .filter(item => item !== null);

    if (numbersArray.length !== continueParticipants.length) {
      showMessage('Please enter numbers (0-36) for all selected participants', 'error');
      setLoading(false);
      return;
    }

    try {
      const response = await adminAxios.post(`/api/games/${currentGame.id}/roulette/next-round`, {
        additionalBet: betInt,
        participantIds: continueParticipants.map(id => parseInt(id))
      });
      
      if (response.data.autoWinner) {
        if (currentGame) {
          setCurrentGame({
            ...currentGame,
            pot_amount: response.data.potAmount
          });
        }
        
        setWinners([{ user_id: response.data.winnerUserId }]);
        
        setPotAlreadyDistributed(true);
        
        setStep('spin');
        
        setShowWinnerModal(true);
        setTimeout(() => {
          playWinnerSound();
          triggerConfetti();
        }, 300);
        
        showMessage(response.data.message || 'Only one participant selected - automatically declared as winner!', 'success');
      } else {
        const gameId = currentGame.id;
        
        await adminAxios.post(`/api/games/${gameId}/roulette/numbers`, {
          participantNumbers: numbersArray
        });

        const gamesResponse = await adminAxios.get('/api/games');
        const updatedGame = gamesResponse.data.find(g => g.id === currentGame.id);
        if (updatedGame) {
          setCurrentGame(updatedGame);
        }
        
        setSelectedParticipants(continueParticipants);
        
        setStep('spin');
        setAdditionalBet('');
        setContinueParticipants([]);
        setSpinResult(null);
        setWinners([]);
        showMessage('Next round started successfully! Numbers saved.', 'success');
        fetchGameParticipants(currentGame.id);
        fetchUsers();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to start next round';
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getParticipantName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : `User ${userId}`;
  };
  if (step === 'entry') {
    return (
      <div className="roulette-container">
        <div className="roulette-card">
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
                          {user.name} (₵{parseInt(user.balance)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedParticipants.length > 0 && (
              <div className="form-group">
                <label>Enter Numbers for Selected Participants (0-36)</label>
                <div className="numbers-form">
                  {selectedParticipants.map((userId) => {
                    const user = users.find(u => u.id.toString() === userId);
                    if (!user) return null;
                    return (
                      <div key={userId} className="number-input-group">
                        <label className="participant-name-label">{user.name}</label>
                        <input
                          type="text"
                          value={participantNumbers[userId] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d+$/.test(value)) {
                              const num = parseInt(value) || 0;
                              if (num >= 0 && num <= 36) {
                                handleNumberChange(userId, value);
                              }
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
                          placeholder="Enter number (0-36)"
                          required
                          className="participant-number-input"
                        />
                        <button
                          type="button"
                          className="remove-participant-btn"
                          onClick={() => handleParticipantToggle(userId)}
                          title="Remove participant"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

  if (step === 'numbers') {
    return (
      <div className="roulette-container">
        <div className="roulette-card">
          <h3 className="roulette-title">Enter Numbers (0-36)</h3>
          <div className="numbers-form">
            {selectedParticipants.map((userId) => {
              const user = users.find(u => u.id.toString() === userId);
              if (!user) return null;
              return (
                <div key={userId} className="number-input-group">
                  <label className="participant-name-label">{user.name}</label>
                  <input
                    type="number"
                    min="0"
                    max="36"
                    step="1"
                    value={participantNumbers[userId] || ''}
                    onChange={(e) => handleNumberChange(userId, e.target.value)}
                    placeholder="Enter number (0-36)"
                    required
                    className="participant-number-input"
                  />
                </div>
              );
            })}
          </div>

          <ToastMessage
            message={message}
            status={messageStatus}
            onClose={() => { setMessage(''); setMessageStatus('error'); }}
          />

          <div className="button-group">
            <button
              onClick={handleSaveNumbers}
              disabled={loading}
              className="submit-btn"
            >
              {loading ? 'Saving...' : 'Save Numbers & Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'spin') {
    const winningIndex = spinResult !== null ? rouletteNumbers.findIndex(n => n.num === spinResult) : -1;
    const winningColor = spinResult !== null ? rouletteNumbers[winningIndex]?.color : null;
    
    return (
      <div className="roulette-container">
        <div className="roulette-card">
          <div className="roulette-top-bar">
            {currentGame && (
              <div className="pot-amount-display">
                <div className="pot-amount-box">
                  <span className="pot-amount-label">💰</span>
                  <span className="pot-amount-text">₵{parseInt(currentGame.pot_amount || 0)}</span>
                </div>
              </div>
            )}

            {spinResult !== null && (
              <div className="spin-result-display">
                <div className={`spin-result-box spin-result-${winningColor}`}>
                  <span className="spin-result-label">🎯</span>
                  <span className="spin-result-number">{spinResult}</span>
                </div>
              </div>
            )}

            <div className="external-roulette-container">
              <button
                onClick={() => window.open('https://www.roulettesimulator.net/simulators/european-roulette/', '_blank')}
                className="external-roulette-btn"
                title="Open Roulette Simulator"
              >
                <img src={rouletteIcon} alt="Roulette" className="roulette-icon-img" />
              </button>
            </div>
          </div>
          
          {spinResult === null && (
            <div className="manual-result-section">
              <div className="result-input-group">
                <input
                  type="text"
                  value={manualSpinResult}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      const num = parseInt(value) || 0;
                      if (num >= 0 && num <= 36) {
                        setManualSpinResult(value);
                      }
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
                  placeholder="Enter number"
                  className="result-input"
                  disabled={loading}
                />
                <button
                  onClick={handleManualSpinResult}
                  disabled={loading || !manualSpinResult}
                  className="submit-result-btn"
                >
                  {loading ? 'Processing...' : 'Enter Result'}
                </button>
              </div>
            </div>
          )}

          <ToastMessage
            message={message}
            status={messageStatus}
            onClose={() => { setMessage(''); setMessageStatus('error'); }}
          />
          
          <WinnerModal
            isOpen={showWinnerModal && winners && winners.length > 0}
            onClose={() => {
              if (potAlreadyDistributed) {
                setShowWinnerModal(false);
                setCurrentGame(null);
                setStep('entry');
                setSelectedParticipants([]);
                setParticipantNumbers({});
                setSpinResult(null);
                setWinners([]);
                setAdditionalBet('');
                setContinueParticipants([]);
                setPotAlreadyDistributed(false);
                fetchUsers();
              } else {
                setShowWinnerModal(false);
              }
            }}
            winners={winners.map(winner => {
              const winnerName = getParticipantName(winner.user_id);
              const winnerAmount = currentGame?.pot_amount ? (currentGame.pot_amount / winners.length) : 0;
              return {
                name: winnerName,
                amount: Math.round(winnerAmount * 100) / 100, // Round to 2 decimal places for display
                number: winner.number
              };
            })}
            onDistributePot={handleDistributePot}
            loading={loading}
            potAlreadyDistributed={potAlreadyDistributed}
            title="🎉 WINNERS! 🎉"
          />
            {spinResult !== null && (
            <div className="spin-result-actions">
              {winners && winners.length > 0 ? (
                <div className="winners-section">
                  <h4 className="winners-title">🎉 WINNERS FOUND! 🎉</h4>
                  <div className="result-info">
                    {winners.map((winner, index) => {
                      const winnerName = getParticipantName(winner.user_id);
                      return (
                        <div key={index} className="winner-display-card">
                          <div className="winner-name-large">{winnerName}</div>
                        </div>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setShowWinnerModal(true)} 
                    className="submit-btn"
                  >
                    View Winners
                  </button>
                </div>
              ) : (
                <div className="no-winners-section">
                  <h4 className="no-winners-title">No Exact Match Found</h4>
                  <p>No participant selected the winning number {spinResult}.</p>
                  
                  <div className="result-actions">
                    <button
                      onClick={handleDeclareNearest}
                      disabled={loading}
                      className="submit-btn"
                    >
                      {loading ? 'Finding...' : 'Declare Nearest Winner'}
                    </button>
                    <button
                      onClick={async () => {
                        // Fetch all participants from current round to populate their numbers
                        if (currentGame) {
                          try {
                            const participantsResponse = await adminAxios.get(`/api/games/${currentGame.id}/participants`);
                            const currentRound = currentGame.round_number || 1;
                            // Get participants from the current round (the round we just finished)
                            const currentRoundParticipants = participantsResponse.data.filter(p => (p.round_number || 1) === currentRound);
                            const numbers = { ...participantNumbers };
                            // Populate numbers for all participants from the current round
                            currentRoundParticipants.forEach(p => {
                              if (p.number !== null && p.number !== undefined) {
                                numbers[p.user_id] = p.number;
                              }
                            });
                            setParticipantNumbers(numbers);
                          } catch (error) {
                            console.error('Error fetching participants:', error);
                          }
                        }
                        setStep('nextRound');
                      }}
                      className="submit-btn secondary-btn"
                    >
                      Play One More Round
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'nextRound') {
    const availableUsers = users.filter(u => selectedParticipants.includes(u.id.toString()));
    const filteredContinue = searchParticipants === ''
      ? availableUsers
      : availableUsers.filter(u => u.name.toLowerCase().includes(searchParticipants.toLowerCase()));

    return (
      <div className="roulette-container">
        <div className="roulette-card">
          <h3 className="roulette-title">Next Round Setup</h3>
          
          <form onSubmit={(e) => { e.preventDefault(); handleNextRound(); }}>
            <div className="form-group">
              <label>Additional Bet Amount</label>
              <input
                type="text"
                value={additionalBet}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d+$/.test(value)) {
                    setAdditionalBet(value);
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
                placeholder="Enter additional bet"
                required
              />
            </div>

            <div className={`form-group ${showDropdown ? 'dropdown-active' : ''}`}>
              <label>Select Participants Who Want to Continue</label>
              <div className="dropdown-container">
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={searchParticipants}
                  onChange={(e) => setSearchParticipants(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  className="search-input"
                />
                {showDropdown && filteredContinue.length > 0 && (
                  <div className="dropdown">
                    <div
                      className="dropdown-item select-all-item"
                      onClick={() => {
                        const allUserIds = filteredContinue.map(u => u.id.toString());
                        const newContinueParticipants = [...new Set([...continueParticipants, ...allUserIds])];
                        setContinueParticipants(newContinueParticipants);
                        // Populate numbers for all selected participants
                        const newNumbers = { ...participantNumbers };
                        filteredContinue.forEach(user => {
                          const userIdStr = user.id.toString();
                          if (participantNumbers[userIdStr] !== undefined && participantNumbers[userIdStr] !== null) {
                            newNumbers[userIdStr] = participantNumbers[userIdStr];
                          }
                        });
                        setParticipantNumbers(newNumbers);
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <span className="select-all-text">✓ Select All</span>
                    </div>
                    {filteredContinue.map((user) => (
                      <div
                        key={user.id}
                        className="dropdown-item"
                        onClick={() => {
                          const userIdStr = user.id.toString();
                          if (continueParticipants.includes(userIdStr)) {
                            setContinueParticipants(continueParticipants.filter(id => id !== userIdStr));
                            const newNumbers = { ...participantNumbers };
                            delete newNumbers[userIdStr];
                            setParticipantNumbers(newNumbers);
                          } else {
                            setContinueParticipants([...continueParticipants, userIdStr]);
                            // Populate number from previous round if available
                            if (participantNumbers[userIdStr] !== undefined && participantNumbers[userIdStr] !== null) {
                              // Number already exists, keep it
                            } else {
                              // Try to get from previous round data if available
                              // This will be handled by the fetch we do when entering nextRound step
                            }
                          }
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <input
                          type="checkbox"
                          checked={continueParticipants.includes(user.id.toString())}
                          onChange={() => {
                            const userIdStr = user.id.toString();
                            if (continueParticipants.includes(userIdStr)) {
                              setContinueParticipants(continueParticipants.filter(id => id !== userIdStr));
                              const newNumbers = { ...participantNumbers };
                              delete newNumbers[userIdStr];
                              setParticipantNumbers(newNumbers);
                            } else {
                              setContinueParticipants([...continueParticipants, userIdStr]);
                              // Number will be populated from participantNumbers if it exists
                            }
                          }}
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
            </div>
            {continueParticipants.length > 0 && (
              <div className="form-group">
                <label>Enter Numbers for Continuing Participants (0-36)</label>
                <div className="numbers-form">
                  {continueParticipants.map((userId) => {
                    const user = users.find(u => u.id.toString() === userId);
                    if (!user) return null;
                    return (
                      <div key={userId} className="number-input-group">
                        <label className="participant-name-label">{user.name}</label>
                        <input
                          type="text"
                          value={participantNumbers[userId] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d+$/.test(value)) {
                              const num = parseInt(value) || 0;
                              if (num >= 0 && num <= 36) {
                                handleNumberChange(userId, value);
                              }
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
                          placeholder="Enter number (0-36)"
                          required
                          className="participant-number-input"
                        />
                        <button
                          type="button"
                          className="remove-participant-btn"
                          onClick={() => {
                            setContinueParticipants(continueParticipants.filter(id => id !== userId));
                            const newNumbers = { ...participantNumbers };
                            delete newNumbers[userId];
                            setParticipantNumbers(newNumbers);
                          }}
                          title="Remove participant"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <ToastMessage
              message={message}
              status={messageStatus}
              onClose={() => { setMessage(''); setMessageStatus('error'); }}
            />

            <div className="button-group">
              <button type="submit" disabled={loading || continueParticipants.length === 0} className="submit-btn">
                {loading ? 'Starting...' : 'Start Next Round'}
              </button>
              <button type="button" onClick={() => setStep('spin')} className="submit-btn secondary-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="roulette-container">
      <div className="roulette-card">
        <h3 className="roulette-title">Debug: Unknown Step</h3>
        <p>Current step: {step}</p>
        <p>Current game: {currentGame ? 'Yes' : 'No'}</p>
        <p>Users loaded: {users.length}</p>
      </div>
    </div>
  );
}

export default Roulette;

