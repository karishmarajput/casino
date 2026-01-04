import React, { useRef, useEffect } from 'react';
import './WinnerModal.css';
import coinSound from '../assets/coin_sound.mp3';

function WinnerModal({ 
  isOpen, 
  onClose, 
  winners = [], 
  onDistributePot, 
  loading = false, 
  potAlreadyDistributed = false,
  title = '🎉 WINNERS! 🎉',
  playSoundOnOpen = false,
  hideBottomButton = false
}) {
  const audioRef = useRef(null);
  const confettiRef = useRef(null);

  const playCoinSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Could not play sound:', err);
      });
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }, 8000);
    }
  };

  const handleDistributeClick = () => {
    if (onDistributePot && !potAlreadyDistributed) {
      playCoinSound();
      onDistributePot();
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen && confettiRef.current) {
      if (playSoundOnOpen) {
        setTimeout(() => {
          playCoinSound();
        }, 300);
      }

      const triggerConfetti = () => {
        const colors = ['#d4af37', '#f4d03f', '#ffd700', '#c9a961'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
          const confetti = document.createElement('div');
          confetti.style.position = 'absolute';
          confetti.style.width = `${Math.random() * 10 + 5}px`;
          confetti.style.height = `${Math.random() * 10 + 5}px`;
          confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          confetti.style.left = `${Math.random() * 100}%`;
          confetti.style.top = '-10px';
          confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
          confetti.style.opacity = '0.9';
          confetti.style.pointerEvents = 'none';
          confetti.style.zIndex = '10001';
          
          const angle = Math.random() * Math.PI * 2;
          const velocity = Math.random() * 300 + 200;
          const rotation = Math.random() * 720 - 360;
          
          confetti.style.transform = `rotate(${rotation}deg)`;
          confetti.style.transition = 'all 3s ease-out';
          
          confettiRef.current.appendChild(confetti);
          
          setTimeout(() => {
            confetti.style.left = `${parseFloat(confetti.style.left) + Math.cos(angle) * velocity}px`;
            confetti.style.top = `${window.innerHeight + 100}px`;
            confetti.style.opacity = '0';
            confetti.style.transform = `rotate(${rotation + 1080}deg)`;
          }, 10);
          
          setTimeout(() => {
            if (confetti.parentNode) {
              confetti.parentNode.removeChild(confetti);
            }
          }, 3000);
        }
      };
      
      setTimeout(triggerConfetti, 300);
    }
  }, [isOpen, playSoundOnOpen]);

  if (!isOpen) return null;

  return (
    <>
      <audio ref={audioRef} src={coinSound} preload="auto" />
      <div ref={confettiRef} className="confetti-container"></div>
      <div className="winners-modal-overlay" onClick={onClose}>
        <div className="winners-modal" onClick={(e) => e.stopPropagation()}>
          <button 
            className="close-winner-modal"
            onClick={onClose}
          >
            ×
          </button>
          <h2 className="winners-modal-title">{title}</h2>
          <div className="winner-display-large">
            {winners.map((winner, index) => (
              <div key={index} className="winner-display-card">
                <div className="winner-name-large">{winner.name}</div>
                {winner.number !== undefined && (
                  <div className="winner-number-info">Number: {winner.number}</div>
                )}
                {winner.amount !== undefined && (
                  <div className="winner-amount-large">${typeof winner.amount === 'number' ? winner.amount.toFixed(2) : parseFloat(winner.amount).toFixed(2)}</div>
                )}
              </div>
            ))}
          </div>
          {!hideBottomButton && (
            <button 
              onClick={handleDistributeClick}
              disabled={loading} 
              className="submit-btn"
            >
              {loading 
                ? (potAlreadyDistributed || !onDistributePot ? 'Closing...' : 'Distributing...') 
                : (potAlreadyDistributed || !onDistributePot ? 'Close' : 'Distribute Pot to Winners')
              }
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default WinnerModal;

