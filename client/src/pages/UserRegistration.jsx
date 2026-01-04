import React, { useState, useEffect } from 'react';
import adminAxios from '../utils/axiosConfig';
import { requireAdminAuth } from '../utils/adminAuth';
import ToastMessage from '../components/ToastMessage';
import './UserRegistration.css';

function UserRegistration() {
  const [mode, setMode] = useState('captains');
  const [names, setNames] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [captainId, setCaptainId] = useState('');
  const [captains, setCaptains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('error');

  const showMessage = (msg, status = 'error') => {
    setMessage(msg);
    setMessageStatus(status);
  };

  useEffect(() => {
    if (!requireAdminAuth()) return;
    if (mode === 'members') {
      fetchCaptains();
    }
  }, [mode]);

  const fetchCaptains = async () => {
    try {
      const response = await adminAxios.get('/api/users/captains');
      setCaptains(response.data);
    } catch (error) {
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageStatus('error');
    setLoading(true);

    if (!names.trim()) {
      showMessage('Please enter at least one name', 'error');
      setLoading(false);
      return;
    }

    if (!initialAmount || parseInt(initialAmount) <= 0) {
      showMessage('Please enter a valid initial amount', 'error');
      setLoading(false);
      return;
    }

    if (mode === 'members' && !captainId) {
      showMessage('Please select a captain', 'error');
      setLoading(false);
      return;
    }

    const nameList = names
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (nameList.length === 0) {
      showMessage('Please enter at least one name', 'error');
      setLoading(false);
      return;
    }

    try {
      let response;
      if (mode === 'captains') {
        response = await adminAxios.post('/api/users/register-captains', {
          names: nameList,
          initialAmount: parseInt(initialAmount),
        });
      } else {
        response = await adminAxios.post('/api/users/register-members', {
          names: nameList,
          initialAmount: parseInt(initialAmount),
          captainId: parseInt(captainId),
        });
      }

      if (response.data.errors && response.data.errors.length > 0) {
        showMessage(`Some errors occurred: ${response.data.errors.join(', ')}`, 'error');
      } else {
        showMessage(`${mode === 'captains' ? 'Captains' : 'Family members'} registered successfully!`, 'success');
        setNames('');
        setCaptainId('');
        if (mode === 'captains') {
          fetchCaptains(); 
        }
      }
    } catch (error) {
      showMessage(error.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      
      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'captains' ? 'active' : ''}`}
          onClick={() => setMode('captains')}
        >
          Register Captains
        </button>
        <button
          className={`mode-btn ${mode === 'members' ? 'active' : ''}`}
          onClick={() => setMode('members')}
        >
          Register Family Members
        </button>
      </div>

      <div className="registration-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Initial Amount (for all users)</label>
            <input
              type="text"
              value={initialAmount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  setInitialAmount(value);
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
              placeholder="Enter initial amount"
              required
            />
            <div className="help-text">
              This amount will be given to all registered users (captains and members).
            </div>
          </div>

          {mode === 'members' && (
            <div className="form-group">
              <label>Select Captain</label>
              <select
                value={captainId}
                onChange={(e) => setCaptainId(e.target.value)}
                className="select-input"
                required
              >
                <option value="">-- Select a Captain --</option>
                {captains.map((captain) => (
                  <option key={captain.id} value={captain.id}>
                    {captain.name} (${parseInt(captain.balance)})
                  </option>
                ))}
              </select>
              <div className="help-text">
                Select the captain for this family. All members will be linked to this captain.
              </div>
            </div>
          )}

          <div className="form-group">
            <label>{mode === 'captains' ? 'Captain Names' : 'Member Names'} (one per line)</label>
            <textarea
              value={names}
              onChange={(e) => setNames(e.target.value)}
              placeholder={mode === 'captains' 
                ? "Enter captain names, one per line:\nJohn Doe\nJane Smith\nBob Johnson"
                : "Enter member names, one per line:\nAlice\nBob\nCharlie"}
              rows={8}
              required
            />
            <div className="help-text">
              Enter each {mode === 'captains' ? 'captain' : 'member'} name on a new line.
            </div>
          </div>

          <ToastMessage
            message={message}
            status={messageStatus}
            onClose={() => { setMessage(''); setMessageStatus('error'); }}
          />

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Registering...' : `Register ${mode === 'captains' ? 'Captains' : 'Members'}`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UserRegistration;
