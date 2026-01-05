import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { baseAxios } from '../../utils/axiosConfig';
import './ClientTransactionHistory.css';
import logoImage from '../../assets/logo2.png';

function ClientTransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const clientUser = localStorage.getItem('clientUser');
    if (!clientUser) {
      navigate('/login');
      return;
    }

    const userData = JSON.parse(clientUser);
    setUser(userData);
    fetchTransactions(userData.id);
  }, [navigate]);

  const fetchTransactions = async (userId) => {
    try {
      const response = await baseAxios.get(`/api/client/users/${userId}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionLabel = (transaction) => {
    if (transaction.from_pot && transaction.to_user) {
      return `Received from Pot → ${transaction.to_user}`;
    } else if (transaction.to_pot && transaction.from_user) {
      return `Sent to Pot ← ${transaction.from_user}`;
    } else if (transaction.from_user && transaction.to_user) {
      return `${transaction.from_user} → ${transaction.to_user}`;
    } else if (transaction.from_user) {
      return `From ${transaction.from_user}`;
    } else if (transaction.to_user) {
      return `To ${transaction.to_user}`;
    }
    return 'Transaction';
  };

  const getTransactionType = (transaction) => {
    if (transaction.from_pot) {
      return 'credit';
    } else if (transaction.to_pot) {
      return 'debit';
    } else if (transaction.from_user === user?.name) {
      return 'debit';
    } else {
      return 'credit';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clientUser');
    navigate('/players/login');
  };

  if (loading) {
    return (
      <div className="client-transaction-container">
        <div className="client-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="client-transaction-container">
      <header className="client-header">
        <div className="client-header-content">
          <img src={logoImage} alt="Casino Logo" className="client-header-logo" />
          <h1>Player Portal</h1>
          <button onClick={handleLogout} className="client-logout-btn">Logout</button>
        </div>
      </header>

      <div className="client-page-header">
        <Link to="/players/dashboard" className="client-back-btn">← Back</Link>
        <h2>Transaction History</h2>
      </div>

      <main className="client-transaction-main">
        {transactions.length === 0 ? (
          <div className="client-empty-state">
            <div className="client-empty-icon">📊</div>
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="client-transaction-list">
            {transactions.map((transaction) => {
              const type = getTransactionType(transaction);
              return (
                <div key={transaction.id} className={`client-transaction-item ${type}`}>
                  <div className="client-transaction-header">
                    <div className="client-transaction-label">
                      {getTransactionLabel(transaction)}
                      {transaction.game_name && (
                        <span className="client-transaction-game"> • {transaction.game_name}</span>
                      )}
                    </div>
                    <div className={`client-transaction-amount ${type}`}>
                      {type === 'credit' ? '+' : '-'}₵{parseInt(transaction.amount)}
                    </div>
                  </div>
                  <div className="client-transaction-date">
                    {formatDate(transaction.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default ClientTransactionHistory;

