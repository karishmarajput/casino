import React, { useState, useEffect } from 'react';
import adminAxios from '../utils/axiosConfig';
import { requireAdminAuth } from '../utils/adminAuth';
import ToastMessage from '../components/ToastMessage';
import './FamilyView.css';

function FamilyView() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('error');

  const showMessage = (msg, status = 'error') => {
    setMessage(msg);
    setMessageStatus(status);
  };

  useEffect(() => {
    if (!requireAdminAuth()) return;
    fetchFamilies();
    const interval = setInterval(fetchFamilies, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchFamilies = async () => {
    try {
      const response = await adminAxios.get('/api/families/users');
      setFamilies(response.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to delete ${memberName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(memberId);
    setMessage('');
    setMessageStatus('error');

    try {
      await adminAxios.delete(`/api/users/${memberId}`);
      showMessage(`${memberName} deleted successfully!`, 'success');
      fetchFamilies();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to delete member', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="family-view-container">
      <ToastMessage
        message={message}
        status={messageStatus}
        onClose={() => { setMessage(''); setMessageStatus('error'); }}
      />

      <div className="families-grid">
        {families.map((family) => (
          <div key={family.captain.id} className="family-card">
            <div className="family-header">
              <div className="captain-info">
                <span className="crown-icon">👑</span>
                <h3 className="captain-name">{family.captain.name}'s Family</h3>
              </div>
              <div className="family-total">
                Total: <span className="amount">₵{parseFloat(family.familyTotal).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="family-members">
              <div className="member-row captain-row">
                <span className="member-name">{family.captain.name} (Captain)</span>
                <span className="member-balance">₵{parseInt(family.captain.balance)}</span>
              </div>
              
              {family.members.map((member) => (
                <div key={member.id} className="member-row">
                  <span className="member-name">{member.name}</span>
                  <div className="member-actions">
                    <span className="member-balance">₵{parseInt(member.balance)}</span>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteMember(member.id, member.name)}
                      disabled={deletingId === member.id}
                      title="Delete member"
                    >
                      {deletingId === member.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
              
              {family.members.length === 0 && (
                <div className="no-members">No members yet</div>
              )}
            </div>
            
            <div className="family-footer">
              <span className="member-count">{family.memberCount} member{family.memberCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        ))}
        
        {families.length === 0 && (
          <div className="no-families">No families registered yet. Register captains first!</div>
        )}
      </div>
    </div>
  );
}

export default FamilyView;

