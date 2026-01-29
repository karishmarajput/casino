import React, { useState, useEffect } from 'react';
import adminAxios from '../utils/axiosConfig';
import { requireAdminAuth } from '../utils/adminAuth';
import './Transaction.css';
import ToastMessage from '../components/ToastMessage';

function Transaction() {
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [fromUserIds, setFromUserIds] = useState([]);
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('error');
  const [fromPotSelected, setFromPotSelected] = useState(false);

  const showMessage = (msg, status = 'error') => {
    setMessage(msg);
    setMessageStatus(status);
  };
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [newTransactionId, setNewTransactionId] = useState(null);

  useEffect(() => {
    if (!requireAdminAuth()) return;
    fetchUsers();
    fetchTransactions();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminAxios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await adminAxios.get('/api/transactions');
      setTransactions(response.data);
    } catch (error) {
    }
  };

  const filteredUsersFrom = searchFrom === ''
    ? users
    : users.filter(user =>
        user.name.toLowerCase().includes(searchFrom.toLowerCase())
      );

  const filteredUsersTo = [
    { id: 'pot', name: 'Pot', balance: 0 },
    ...(searchTo === ''
      ? users
      : users.filter(user =>
          user.name.toLowerCase().includes(searchTo.toLowerCase())
        ))
  ];

  const allFilteredUsersFromSelected = filteredUsersFrom.length > 0 && 
    filteredUsersFrom.every(user => fromUserIds.includes(user.id.toString()));

  const handleSelectAllFrom = () => {
    if (allFilteredUsersFromSelected) {
      // Deselect all filtered users
      setFromUserIds(fromUserIds.filter(id => 
        !filteredUsersFrom.some(user => user.id.toString() === id)
      ));
    } else {
      // Select all filtered users (excluding pot)
      const filteredUserIds = filteredUsersFrom
        .map(user => user.id.toString());
      setFromUserIds([...new Set([...fromUserIds, ...filteredUserIds])]);
    }
  };

  const handleFromUserToggle = (userId) => {
    // If switching to user selection, ensure Pot is not selected
    setFromPotSelected(false);
    const userIdStr = userId.toString();
    if (fromUserIds.includes(userIdStr)) {
      setFromUserIds(fromUserIds.filter(id => id !== userIdStr));
    } else {
      setFromUserIds([...fromUserIds, userIdStr]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageStatus('error');
    setLoading(true);

    const toPot = searchTo.toLowerCase() === 'pot';
    const isFromPot = fromPotSelected;

    if ((!isFromPot && fromUserIds.length === 0) || (!toUserId && !toPot) || !amount) {
      showMessage('Please fill in all fields and select at least one sender', 'error');
      setLoading(false);
      return;
    }

    const amountInt = parseInt(amount);
    if (isNaN(amountInt) || amountInt <= 0) {
      showMessage('Amount must be a positive number', 'error');
      setLoading(false);
      return;
    }

    try {
      if (isFromPot) {
        if (toPot) {
          showMessage('Cannot transfer from Pot to Pot', 'error');
          setLoading(false);
          return;
        }

        // Single transaction: Pot -> User
        await adminAxios.post('/api/transactions', {
          fromUserId: null,
          toUserId: parseInt(toUserId),
          fromPot: true,
          toPot: false,
          amount: amountInt,
        });
        showMessage(`Transaction completed successfully! Pot sent ₵${amountInt}.`, 'success');
      } else {
        const transactions = fromUserIds.map(fromUserId => ({
          fromUserId: parseInt(fromUserId),
          toUserId: toPot ? null : parseInt(toUserId),
          fromPot: false,
          toPot: toPot,
          amount: amountInt,
        }));

        await adminAxios.post('/api/transactions/batch', { transactions });
        showMessage(`Transaction completed successfully! ${fromUserIds.length} user(s) sent ₵${amountInt} each.`, 'success');
      }
      setShowSuccessAnimation(true);
      
      // Play coin falling sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create multiple coins falling with cascading effect
        // Each coin has a "ping" sound that gets lower as it falls
        const coinCount = 5; // Match the number of visual coins
        
        for (let i = 0; i < coinCount; i++) {
          setTimeout(() => {
            // Create a coin drop sound: starts high, falls down
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const delay = audioContext.createDelay();
            
            oscillator.connect(delay);
            delay.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Start frequency (higher pitch)
            const startFreq = 1200 - (i * 50); // Slightly different pitch for each coin
            const endFreq = 400; // Lower pitch as it falls
            
            oscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioContext.currentTime + 0.3);
            
            oscillator.type = 'sine';
            
            // Volume envelope: quick attack, then fade out
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            // Add a slight delay for echo effect
            delay.delayTime.setValueAtTime(0.05, audioContext.currentTime);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
            // Add a "clink" sound when coin hits (shorter, sharper)
            setTimeout(() => {
              const clinkOsc = audioContext.createOscillator();
              const clinkGain = audioContext.createGain();
              
              clinkOsc.connect(clinkGain);
              clinkGain.connect(audioContext.destination);
              
              clinkOsc.frequency.value = 600 + (i * 20);
              clinkOsc.type = 'square'; // Sharper sound for impact
              
              clinkGain.gain.setValueAtTime(0.1, audioContext.currentTime);
              clinkGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
              
              clinkOsc.start(audioContext.currentTime);
              clinkOsc.stop(audioContext.currentTime + 0.1);
            }, 300 + (i * 50)); // Stagger the clink sounds
          }, i * 100); // Stagger each coin drop
        }
      } catch (e) {
        // Sound not available
      }
      
      setAmount('');
      setFromUserIds([]);
      setToUserId('');
      setSearchFrom('');
      setSearchTo('');
      
      // Fetch updated transactions and highlight the new one
      const transactionsResponse = await adminAxios.get('/api/transactions');
      const updatedTransactions = transactionsResponse.data;
      setTransactions(updatedTransactions);
      
      // Set the newest transaction ID for animation
      if (updatedTransactions.length > 0) {
        setNewTransactionId(updatedTransactions[0].id);
        // Clear the highlight after animation
        setTimeout(() => setNewTransactionId(null), 2000);
      }
      
      fetchUsers(); // Refresh user list to update balances
      
      // Clear success animation after 3 seconds
      setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 3000);
    } catch (error) {
      showMessage(error.response?.data?.error || 'Transaction failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getTransactionLabel = (transaction) => {
    if (transaction.from_pot === 1) {
      return `Pot → ${transaction.to_user || 'User'}`;
    } else if (transaction.to_pot === 1) {
      return `${transaction.from_user || 'User'} → Pot`;
    } else {
      return `${transaction.from_user || 'User'} → ${transaction.to_user || 'User'}`;
    }
  };

  return (
    <div className="transaction-container">
      <h2 className="page-title">💸 Make a Transaction</h2>
      <div className="transaction-layout">
        <div className="transaction-form-section">
          <div className="transaction-card">
            <form onSubmit={handleSubmit}>
              <div className={`form-group ${showFromDropdown ? 'dropdown-active' : ''}`}>
                <label>From User(s)</label>
                <div className="dropdown-container">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchFrom}
                    onChange={(e) => {
                      setSearchFrom(e.target.value);
                    }}
                    onFocus={() => setShowFromDropdown(true)}
                    onBlur={() => {
                      // Delay to allow click events on dropdown items
                      setTimeout(() => setShowFromDropdown(false), 200);
                    }}
                    className="search-input"
                  />
                  {showFromDropdown && (filteredUsersFrom.length > 0 || true) && (
                    <div className="dropdown">
                      {/* Pot option */}
                      <div
                        className={`dropdown-item ${fromPotSelected ? 'selected' : ''}`}
                        onClick={() => {
                          const next = !fromPotSelected;
                          setFromPotSelected(next);
                          if (next) {
                            // When Pot is selected, clear individual senders
                            setFromUserIds([]);
                          }
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <input
                          type="checkbox"
                          checked={fromPotSelected}
                          onChange={() => {
                            const next = !fromPotSelected;
                            setFromPotSelected(next);
                            if (next) {
                              setFromUserIds([]);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="checkbox-input"
                        />
                        <span>Pot</span>
                      </div>

                      {filteredUsersFrom.length > 0 && (
                        <div
                          className="dropdown-item select-all-item"
                          onClick={handleSelectAllFrom}
                        >
                          <input
                            type="checkbox"
                            checked={allFilteredUsersFromSelected}
                            onChange={handleSelectAllFrom}
                            onClick={(e) => e.stopPropagation()}
                            className="checkbox-input"
                          />
                          <span className="select-all-text">Select All</span>
                        </div>
                      )}
                      {filteredUsersFrom.map((user) => (
                        <div
                          key={user.id}
                          className={`dropdown-item ${user.id === 'pot' ? 'disabled' : ''}`}
                          onClick={() => {
                            handleFromUserToggle(user.id);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {user.id !== 'pot' && (
                            <input
                              type="checkbox"
                              checked={fromUserIds.includes(user.id.toString())}
                              onChange={() => handleFromUserToggle(user.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="checkbox-input"
                            />
                          )}
                          <span>
                            {user.name} {user.id !== 'pot' && `(₵${parseInt(user.balance)})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {(fromUserIds.length > 0 || fromPotSelected) && (
                  <div className="selected-users">
                    <div className="selected-users-label">
                      Selected ({fromUserIds.length + (fromPotSelected ? 1 : 0)}):
                    </div>
                    <div className="selected-users-list">
                      {fromPotSelected && (
                        <span
                          className="selected-user-tag"
                          onClick={() => setFromPotSelected(false)}
                        >
                          Pot
                        </span>
                      )}
                      {fromUserIds.map((userId) => {
                        const user = users.find(u => u.id.toString() === userId);
                        return user ? (
                          <span
                            key={userId}
                            className="selected-user-tag"
                            onClick={() => handleFromUserToggle(userId)}
                          >
                            {user.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className={`form-group ${showToDropdown ? 'dropdown-active' : ''}`}>
                <label>To User</label>
                <div className="dropdown-container">
                  <input
                    type="text"
                    placeholder="Search user..."
                    value={searchTo}
                    onChange={(e) => {
                      setSearchTo(e.target.value);
                      setToUserId('');
                    }}
                    onFocus={() => setShowToDropdown(true)}
                    onBlur={() => {
                      // Delay to allow click events on dropdown items
                      setTimeout(() => setShowToDropdown(false), 200);
                    }}
                    className="search-input"
                  />
                  {showToDropdown && filteredUsersTo.length > 0 && (
                    <div className="dropdown">
                      {filteredUsersTo.map((user) => (
                        <div
                          key={user.id}
                          className="dropdown-item"
                          onClick={() => {
                            if (user.id === 'pot') {
                              setToUserId('');
                              setSearchTo('Pot');
                            } else {
                              setToUserId(user.id.toString());
                              setSearchTo(user.name);
                            }
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {user.name} {user.id !== 'pot' && `(₵${parseFloat(user.balance).toFixed(2)})`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {searchTo && (
                  <div className="selected-user">
                    Selected: {searchTo === 'Pot' ? 'Pot' : users.find(u => u.id.toString() === toUserId)?.name}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Amount</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setAmount(value);
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
                  required
                />
              </div>

              <ToastMessage
                message={message}
                status={messageStatus}
                onClose={() => { setMessage(''); setMessageStatus('error'); }}
              />

              {showSuccessAnimation && (
                <div className="money-transfer-animation">
                  <div className="coin-animation">
                    <div className="coin coin-1">₵</div>
                    <div className="coin coin-2">₵</div>
                    <div className="coin coin-3">₵</div>
                    <div className="coin coin-4">₵</div>
                    <div className="coin coin-5">₵</div>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Processing...' : 'Transfer Money'}
              </button>
            </form>
          </div>
        </div>

        <div className="transaction-history-section">
          <h3 className="history-title">Transaction History</h3>
          <div className="transaction-history">
            {transactions.length === 0 ? (
              <div className="no-transactions">No transactions yet</div>
            ) : (
              transactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className={`transaction-item ${newTransactionId === transaction.id ? 'new-transaction' : ''}`}
                >
                  <div className="transaction-main">
                    <div className="transaction-label">
                      {getTransactionLabel(transaction)}
                      {(transaction.game_name || transaction.game_type) && (
                        <span className="transaction-game-name"> • {transaction.game_name || transaction.game_type}</span>
                      )}
                    </div>
                    <div className="transaction-amount">₵{parseInt(transaction.amount)}</div>
                  </div>
                  <div className="transaction-date">{formatDate(transaction.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Transaction;

