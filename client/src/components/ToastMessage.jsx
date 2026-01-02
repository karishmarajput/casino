import React, { useEffect } from 'react';
import './ToastMessage.css';

function ToastMessage({ message, status = 'error', onClose }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  const toastStatus = status === 'success' ? 'success' : 'error';

  return (
    <div className={`toast-message toast-${toastStatus}`}>
      <div className="toast-content">
        <span className="toast-text">{message}</span>
        <button className="toast-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
}

export default ToastMessage;

