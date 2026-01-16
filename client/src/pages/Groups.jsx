import React, { useState, useEffect } from 'react';
import adminAxios from '../utils/axiosConfig';
import './Groups.css';

function Groups() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [createSearchUser, setCreateSearchUser] = useState('');
  const [showCreateUserDropdown, setShowCreateUserDropdown] = useState(false);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('error');
  const [searchGroup, setSearchGroup] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await adminAxios.get('/api/groups');
      setGroups(response.data);
      setLoading(false);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to fetch groups');
      setMessageStatus('error');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await adminAxios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchGroupMembers = async (groupId) => {
    try {
      const response = await adminAxios.get(`/api/groups/${groupId}`);
      setGroupMembers(response.data.members || []);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to fetch group members');
      setMessageStatus('error');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const payload = {
        ...formData,
        memberIds: selectedMembers.map(m => m.id)
      };
      await adminAxios.post('/api/groups', payload);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      setSelectedMembers([]);
      setCreateSearchUser('');
      fetchGroups();
      setMessage('Group created successfully');
      setMessageStatus('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to create group');
      setMessageStatus('error');
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await adminAxios.put(`/api/groups/${selectedGroup.id}`, formData);
      setShowEditModal(false);
      setSelectedGroup(null);
      setFormData({ name: '', description: '' });
      fetchGroups();
      setMessage('Group updated successfully');
      setMessageStatus('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update group');
      setMessageStatus('error');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group? This will remove all members from the group.')) {
      return;
    }
    setMessage('');
    try {
      await adminAxios.delete(`/api/groups/${groupId}`);
      fetchGroups();
      setMessage('Group deleted successfully');
      setMessageStatus('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to delete group');
      setMessageStatus('error');
    }
  };

  const handleAddMembers = async (userIds) => {
    setMessage('');
    try {
      await adminAxios.post(`/api/groups/${selectedGroup.id}/members/batch`, { userIds });
      fetchGroupMembers(selectedGroup.id);
      setSearchUser('');
      setShowUserDropdown(false);
      setMessage('Members added successfully');
      setMessageStatus('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to add members');
      setMessageStatus('error');
    }
  };

  const handleRemoveMember = async (userId) => {
    setMessage('');
    try {
      await adminAxios.delete(`/api/groups/${selectedGroup.id}/members/${userId}`);
      fetchGroupMembers(selectedGroup.id);
      setMessage('Member removed successfully');
      setMessageStatus('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to remove member');
      setMessageStatus('error');
    }
  };

  const openEditModal = (group) => {
    setSelectedGroup(group);
    setFormData({ name: group.name, description: group.description || '' });
    setShowEditModal(true);
  };

  const openMembersModal = async (group) => {
    setSelectedGroup(group);
    await fetchGroupMembers(group.id);
    setShowMembersModal(true);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchGroup.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    !groupMembers.find(m => m.id === user.id) &&
    user.name.toLowerCase().includes(searchUser.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading groups...</div>;
  }

  return (
    <div className="groups-container">
      <div className="groups-header">
        <h1 className="groups-title">Groups Management</h1>
        <button 
          className="create-group-btn"
          onClick={() => {
            setFormData({ name: '', description: '' });
            setSelectedMembers([]);
            setCreateSearchUser('');
            setShowCreateModal(true);
          }}
        >
          + Create Group
        </button>
      </div>

      {message && (
        <div className={`message ${messageStatus}`}>
          {message}
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <div className="search-container">
        <input
          type="text"
          placeholder="Search groups..."
          value={searchGroup}
          onChange={(e) => setSearchGroup(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="groups-grid">
        {filteredGroups.map((group) => (
          <div key={group.id} className="group-card">
            <div className="group-card-header">
              <h3 className="group-name">{group.name}</h3>
              <div className="group-actions">
                <button
                  className="action-btn edit-btn"
                  onClick={() => openEditModal(group)}
                  title="Edit Group"
                >
                  ✏️
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteGroup(group.id)}
                  title="Delete Group"
                >
                  🗑️
                </button>
              </div>
            </div>
            {group.description && (
              <p className="group-description">{group.description}</p>
            )}
            <div className="group-info">
              {group.member_names && group.member_names.length > 0 ? (
                <div className="group-members">
                  <div className="member-count-label">👥 Members ({group.member_count || 0}):</div>
                  <div className="member-names-list">
                    {group.member_names.map((name, index) => (
                      <span key={index} className="member-name-tag">{name}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="member-count">👥 {group.member_count || 0} members</span>
              )}
            </div>
            <button
              className="manage-members-btn"
              onClick={() => openMembersModal(group)}
            >
              Manage Members
            </button>
          </div>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="no-groups">
          {searchGroup ? 'No groups found matching your search.' : 'No groups created yet. Create your first group!'}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label>Group Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter group description (optional)"
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Add Members (Optional)</label>
                <div className={`form-group ${showCreateUserDropdown ? 'dropdown-active' : ''}`}>
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={createSearchUser}
                    onChange={(e) => {
                      setCreateSearchUser(e.target.value);
                      setShowCreateUserDropdown(true);
                    }}
                    onFocus={() => setShowCreateUserDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCreateUserDropdown(false), 200)}
                    className="search-input"
                  />
                  {showCreateUserDropdown && (
                    <div className="user-dropdown">
                      {users
                        .filter(user => 
                          !selectedMembers.find(m => m.id === user.id) &&
                          user.name.toLowerCase().includes(createSearchUser.toLowerCase())
                        )
                        .map((user) => (
                          <div
                            key={user.id}
                            className="user-dropdown-item"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              // Add user without closing dropdown or clearing search
                              if (!selectedMembers.find(m => m.id === user.id)) {
                                setSelectedMembers([...selectedMembers, user]);
                                // Keep dropdown open and search text for adding more users
                              }
                            }}
                          >
                            {user.name} (₵{parseInt(user.balance)})
                          </div>
                        ))}
                      {users.filter(user => 
                        !selectedMembers.find(m => m.id === user.id) &&
                        user.name.toLowerCase().includes(createSearchUser.toLowerCase())
                      ).length === 0 && createSearchUser && (
                        <div className="user-dropdown-item" style={{ color: 'rgba(255,255,255,0.5)', cursor: 'default' }}>
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedMembers.length > 0 && (
                  <div className="selected-members">
                    <div className="selected-members-label">Selected Members ({selectedMembers.length}):</div>
                    <div className="selected-members-list">
                      {selectedMembers.map((member) => (
                        <span
                          key={member.id}
                          className="selected-member-tag"
                          onClick={() => setSelectedMembers(selectedMembers.filter(m => m.id !== member.id))}
                        >
                          {member.name} ×
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditModal && selectedGroup && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Group</h2>
            <form onSubmit={handleUpdateGroup}>
              <div className="form-group">
                <label>Group Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter group description (optional)"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
          <div className="modal-content members-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Manage Members - {selectedGroup.name}</h2>
            
            <div className="add-members-section">
              <h3>Add Members</h3>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Search users to add..."
                  value={searchUser}
                  onChange={(e) => {
                    setSearchUser(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                  className="search-input"
                />
                {showUserDropdown && filteredUsers.length > 0 && (
                  <div className="user-dropdown">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="user-dropdown-item"
                        onClick={() => handleAddMembers([user.id])}
                      >
                        {user.name} (₵{parseInt(user.balance)})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="members-list-section">
              <h3>Current Members ({groupMembers.length})</h3>
              {groupMembers.length > 0 ? (
                <div className="members-list">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="member-item">
                      <span className="member-name">{member.name}</span>
                      <span className="member-balance">₵{parseInt(member.balance)}</span>
                      <button
                        className="remove-member-btn"
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove from group"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-members">No members in this group yet.</p>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowMembersModal(false)} className="close-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Groups;

