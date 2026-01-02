import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminAxios from '../utils/axiosConfig';
import { requireAdminAuth } from '../utils/adminAuth';
import './FlushDatabase.css';

function FlushDatabase() {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [isFlushing, setIsFlushing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!requireAdminAuth()) return;
  }, []);

  const handleFlush = async () => {
    if (confirmText.toLowerCase() !== 'flush') {
      setError('Please type "FLUSH" to confirm');
      return;
    }

    setIsFlushing(true);
    setError('');

    try {
      await adminAxios.post('/api/admin/flush-database');
      alert('Database has been flushed successfully!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to flush database');
      setIsFlushing(false);
    }
  };

  return (
    <div className="flush-container">
      <div className="flush-card">
        <div className="flush-icon">⚠️</div>
        <h1 className="flush-title">Flush Database</h1>
        <p className="flush-warning">
          This action will <strong>permanently delete</strong> all data from the database including:
        </p>
        <ul className="flush-list">
          <li>All users and their balances</li>
          <li>All transactions</li>
          <li>All games and game participants</li>
          <li>Pot balance</li>
          <li>All family relationships</li>
        </ul>
        <p className="flush-warning-text">
          <strong>This action cannot be undone!</strong>
        </p>
        <div className="flush-confirm-section">
          <label htmlFor="confirm-input" className="flush-label">
            Type <strong>"FLUSH"</strong> to confirm:
          </label>
          <input
            id="confirm-input"
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setError('');
            }}
            className="flush-input"
            placeholder="Type FLUSH here"
            disabled={isFlushing}
          />
          {error && <div className="flush-error">{error}</div>}
        </div>
        <div className="flush-actions">
          <button
            onClick={() => navigate('/')}
            className="flush-btn cancel-btn"
            disabled={isFlushing}
          >
            Cancel
          </button>
          <button
            onClick={handleFlush}
            className="flush-btn flush-btn-danger"
            disabled={isFlushing || confirmText.toLowerCase() !== 'flush'}
          >
            {isFlushing ? 'Flushing...' : 'Flush Database'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FlushDatabase;

