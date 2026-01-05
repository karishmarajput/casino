import React, { useState, useEffect } from 'react';
import adminAxios from '../utils/axiosConfig';
import ToastMessage from '../components/ToastMessage';
import './RewardsView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function RewardsView() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState(null);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('error');

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const response = await adminAxios.get('/api/rewards');
      setRewards(response.data);
      setLoading(false);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to fetch rewards');
      setMessageStatus('error');
      setLoading(false);
    }
  };

  const handleRewardClick = (reward) => {
    setSelectedReward(reward);
  };

  const handleBackToList = () => {
    setSelectedReward(null);
  };


  if (loading) {
    return (
      <div className="rewards-view-container">
        <div className="rewards-view-card">
          <div className="loading">Loading rewards...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rewards-view-container">
      <div className="rewards-view-card">
        {selectedReward && (
          <button onClick={handleBackToList} className="back-btn">
            ← Back to List
          </button>
        )}

        <ToastMessage
          message={message}
          status={messageStatus}
          onClose={() => { setMessage(''); setMessageStatus('error'); }}
        />

        {selectedReward ? (
          <div className="reward-detail-view">
            <div className="reward-detail-card">
              <div className="reward-detail-image-container">
                {selectedReward.image_url ? (
                  <img 
                    src={selectedReward.image_url.startsWith('/uploads') 
                      ? `${API_BASE_URL}${selectedReward.image_url}` 
                      : selectedReward.image_url} 
                    alt={selectedReward.name} 
                    className="reward-detail-image" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                {(!selectedReward.image_url || selectedReward.image_url === '') && (
                  <div className="reward-detail-image-placeholder">🎁</div>
                )}
              </div>
              <div className="reward-detail-info">
                <h2 className="reward-detail-name">{selectedReward.name}</h2>
                <div className="reward-detail-details">
                  <div className="reward-detail-item-large">
                    <span className="detail-label-large">Price:</span>
                    <span className="detail-value-large">₵{selectedReward.price}</span>
                  </div>
                  <div className="reward-detail-item-large">
                    <span className="detail-label-large">Quantity:</span>
                    <span className="detail-value-large">{selectedReward.quantity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rewards-list">
            {rewards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎁</div>
                <p>No rewards found.</p>
              </div>
            ) : (
              <div className="rewards-grid">
                {rewards.map((reward) => (
                  <div 
                    key={reward.id} 
                    className="reward-card clickable"
                    onClick={() => handleRewardClick(reward)}
                  >
                    <div className="reward-image-container">
                      {reward.image_url ? (
                        <img 
                          src={reward.image_url.startsWith('/uploads') 
                            ? `${API_BASE_URL}${reward.image_url}` 
                            : reward.image_url} 
                          alt={reward.name} 
                          className="reward-image" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      {(!reward.image_url || reward.image_url === '') && (
                        <div className="reward-image-placeholder">🎁</div>
                      )}
                    </div>
                    <div className="reward-info">
                      <h3 className="reward-name">{reward.name}</h3>
                      <div className="reward-details">
                        <div className="reward-detail-item">
                          <span className="detail-label">Price:</span>
                          <span className="detail-value">₵{reward.price}</span>
                        </div>
                        <div className="reward-detail-item">
                          <span className="detail-label">Quantity:</span>
                          <span className="detail-value">{reward.quantity}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RewardsView;

