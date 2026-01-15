import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { baseAxios } from '../../utils/axiosConfig';
import './ClientRewards.css';
import logoImage from '../../assets/logo2.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function ClientRewards() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const clientUser = localStorage.getItem('clientUser');
    if (!clientUser) {
      navigate('/login');
      return;
    }
    fetchRewards();
  }, [navigate]);

  const fetchRewards = async () => {
    try {
      const response = await baseAxios.get('/api/client/rewards');
      setRewards(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clientUser');
    navigate('/login');
  };

  const handleRewardClick = (reward) => {
    setSelectedReward(reward);
  };

  const handleBackToList = () => {
    setSelectedReward(null);
  };

  if (loading) {
    return (
      <div className="client-rewards-container">
        <header className="client-header">
          <div className="client-header-content">
            <img src={logoImage} alt="Casino Logo" className="client-header-logo" />
            <h1>Player Portal</h1>
            <button onClick={handleLogout} className="client-logout-btn">Logout</button>
          </div>
        </header>
        <div className="client-rewards-card">
          <div className="client-loading">Loading rewards...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="client-rewards-container">
      <header className="client-header">
        <div className="client-header-content">
          <img src={logoImage} alt="Casino Logo" className="client-header-logo" />
          <h1>Player Portal</h1>
          <button onClick={handleLogout} className="client-logout-btn">Logout</button>
        </div>
      </header>

      <div className="client-page-header">
        <Link to="/players/dashboard" className="client-back-btn">←</Link>
        <h4>Rewards</h4>
      </div>

      <div className="client-rewards-card">
        {selectedReward && (
          <button onClick={handleBackToList} className="client-back-btn-inline">
            ←
          </button>
        )}

        {selectedReward ? (
          <div className="client-reward-detail-view">
            <div className="client-reward-detail-card">
              <div className="client-reward-detail-image-container">
                {selectedReward.image_url ? (
                  <img 
                    src={selectedReward.image_url.startsWith('/uploads') 
                      ? `${API_BASE_URL}${selectedReward.image_url}` 
                      : selectedReward.image_url} 
                    alt={selectedReward.name} 
                    className="client-reward-detail-image" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                {(!selectedReward.image_url || selectedReward.image_url === '') && (
                  <div className="client-reward-detail-image-placeholder">🎁</div>
                )}
              </div>
              <div className="client-reward-detail-info">
                <h2 className="client-reward-detail-name">{selectedReward.name}</h2>
                <div className="client-reward-detail-details">
                  <div className="client-reward-detail-item-large">
                    <span className="client-detail-label-large">Price:</span>
                    <span className="client-detail-value-large">₵{selectedReward.price}</span>
                  </div>
                  <div className="client-reward-detail-item-large">
                    <span className="client-detail-label-large">Quantity Available:</span>
                    <span className="client-detail-value-large">{selectedReward.quantity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="client-rewards-list">
            {rewards.length === 0 ? (
              <div className="client-empty-state">
                <div className="client-empty-icon">🎁</div>
                <p>No rewards available at the moment.</p>
              </div>
            ) : (
              <div className="client-rewards-grid">
                {rewards.map((reward) => (
                  <div 
                    key={reward.id} 
                    className="client-reward-card clickable"
                    onClick={() => handleRewardClick(reward)}
                  >
                    <div className="client-reward-image-container">
                      {reward.image_url ? (
                        <img 
                          src={reward.image_url.startsWith('/uploads') 
                            ? `${API_BASE_URL}${reward.image_url}` 
                            : reward.image_url} 
                          alt={reward.name} 
                          className="client-reward-image" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      {(!reward.image_url || reward.image_url === '') && (
                        <div className="client-reward-image-placeholder">🎁</div>
                      )}
                    </div>
                    <div className="client-reward-info">
                      <h3 className="client-reward-name">{reward.name}</h3>
                      <div className="client-reward-details">
                        <div className="client-reward-detail-item">
                          <span className="client-detail-label">Price:</span>
                          <span className="client-detail-value">₵{reward.price}</span>
                        </div>
                        <div className="client-reward-detail-item">
                          <span className="client-detail-label">Available:</span>
                          <span className="client-detail-value">{reward.quantity}</span>
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

export default ClientRewards;

