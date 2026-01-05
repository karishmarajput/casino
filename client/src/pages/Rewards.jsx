import React, { useState, useEffect } from 'react';
import adminAxios, { baseAxios } from '../utils/axiosConfig';
import ToastMessage from '../components/ToastMessage';
import './Rewards.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [viewingReward, setViewingReward] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    image_url: '', 
    price: '', 
    quantity: '' 
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
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
    setViewingReward(reward);
  };

  const handleBackToList = () => {
    setViewingReward(null);
    setSelectedReward(null);
  };

  const handleCreate = () => {
    setFormData({ name: '', image_url: '', price: '', quantity: '' });
    setSelectedImage(null);
    setImagePreview(null);
    setShowCreateModal(true);
  };

  const handleEdit = (reward) => {
    setSelectedReward(reward || viewingReward);
    const rewardToEdit = reward || viewingReward;
    setFormData({
      name: rewardToEdit.name || '',
      image_url: rewardToEdit.image_url || '',
      price: rewardToEdit.price || '',
      quantity: rewardToEdit.quantity || ''
    });
    setSelectedImage(null);
    setImagePreview(rewardToEdit.image_url || null);
    setShowEditModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      // Clear URL input when file is selected
      setFormData({ ...formData, image_url: '' });
    }
  };

  const handleImageUrlChange = (e) => {
    setFormData({ ...formData, image_url: e.target.value });
    // Clear file selection when URL is entered
    setSelectedImage(null);
    setImagePreview(e.target.value || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageStatus('error');

    if (!formData.name || !formData.name.trim()) {
      setMessage('Reward name is required');
      setMessageStatus('error');
      return;
    }

    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) < 0) {
      setMessage('Valid price is required');
      setMessageStatus('error');
      return;
    }

    if (!formData.quantity || isNaN(formData.quantity) || parseInt(formData.quantity) < 0) {
      setMessage('Valid quantity is required');
      setMessageStatus('error');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('price', parseInt(formData.price));
      formDataToSend.append('quantity', parseInt(formData.quantity));
      
      // If image file is selected, append it; otherwise append image_url
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      } else if (formData.image_url && formData.image_url.trim()) {
        formDataToSend.append('image_url', formData.image_url.trim());
      }

      if (showCreateModal) {
        await adminAxios.post('/api/rewards', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        setMessage('Reward created successfully!', 'success');
      } else {
        await adminAxios.put(`/api/rewards/${selectedReward.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        setMessage('Reward updated successfully!', 'success');
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setFormData({ name: '', image_url: '', price: '', quantity: '' });
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedReward(null);
      fetchRewards();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to save reward');
      setMessageStatus('error');
    }
  };

  const handleDelete = async (rewardId) => {
    if (!window.confirm('Are you sure you want to delete this reward?')) {
      return;
    }

    try {
      await adminAxios.delete(`/api/rewards/${rewardId}`);
      setMessage('Reward deleted successfully!', 'success');
      fetchRewards();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to delete reward');
      setMessageStatus('error');
    }
  };


  if (loading) {
    return (
      <div className="rewards-container">
        <div className="rewards-card">
          <div className="loading">Loading rewards...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rewards-container">
      <div className="rewards-card">
        {viewingReward ? (
          <div className="reward-view-actions">
            <button onClick={handleBackToList} className="back-btn">
              ← Back
            </button>
            <button onClick={() => handleEdit()} className="edit-btn-header">
              Edit
            </button>
            <button onClick={handleCreate} className="create-btn">
              + Add Reward
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={handleCreate} className="create-btn">
              + Add Reward
            </button>
          </div>
        )}

        <ToastMessage
          message={message}
          status={messageStatus}
          onClose={() => { setMessage(''); setMessageStatus('error'); }}
        />

        {viewingReward ? (
          <div className="reward-detail-view">
            <div className="reward-detail-card">
              <div className="reward-detail-image-container">
                {viewingReward.image_url ? (
                  <img 
                    src={viewingReward.image_url.startsWith('/uploads') 
                      ? `${API_BASE_URL}${viewingReward.image_url}` 
                      : viewingReward.image_url} 
                    alt={viewingReward.name} 
                    className="reward-detail-image" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                {(!viewingReward.image_url || viewingReward.image_url === '') && (
                  <div className="reward-detail-image-placeholder">🎁</div>
                )}
              </div>
              <div className="reward-detail-info">
                <h2 className="reward-detail-name">{viewingReward.name}</h2>
                <div className="reward-detail-details">
                  <div className="reward-detail-item-large">
                    <span className="detail-label-large">Price:</span>
                    <span className="detail-value-large">₵{viewingReward.price}</span>
                  </div>
                  <div className="reward-detail-item-large">
                    <span className="detail-label-large">Quantity:</span>
                    <span className="detail-value-large">{viewingReward.quantity}</span>
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
                <p>No rewards found. Click on a reward to view details.</p>
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Reward</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Reward Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter reward name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Image</label>
                <div className="image-upload-section">
                  <div className="image-preview-container">
                    {imagePreview && (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Preview" />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setSelectedImage(null);
                            setFormData({ ...formData, image_url: '' });
                          }}
                          className="remove-image-btn"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="image-input-options">
                    <div className="file-upload-wrapper">
                      <label className="file-upload-label">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="file-input"
                        />
                        <span className="file-upload-button">📁 Upload Image</span>
                      </label>
                    </div>
                    <div className="or-divider">OR</div>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={handleImageUrlChange}
                      placeholder="Enter image URL"
                      className="url-input"
                    />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Price (₵) *</label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setFormData({ ...formData, price: value });
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
                  placeholder="Enter price"
                  required
                />
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setFormData({ ...formData, quantity: value });
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
                  placeholder="Enter quantity"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Reward</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Reward Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter reward name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Image</label>
                <div className="image-upload-section">
                  <div className="image-preview-container">
                    {imagePreview && (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Preview" />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setSelectedImage(null);
                            setFormData({ ...formData, image_url: '' });
                          }}
                          className="remove-image-btn"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="image-input-options">
                    <div className="file-upload-wrapper">
                      <label className="file-upload-label">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="file-input"
                        />
                        <span className="file-upload-button">📁 Upload Image</span>
                      </label>
                    </div>
                    <div className="or-divider">OR</div>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={handleImageUrlChange}
                      placeholder="Enter image URL"
                      className="url-input"
                    />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Price (₵) *</label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setFormData({ ...formData, price: value });
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
                  placeholder="Enter price"
                  required
                />
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setFormData({ ...formData, quantity: value });
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
                  placeholder="Enter quantity"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rewards;

