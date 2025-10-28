import React, { useState, useEffect } from 'react';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';

function ClaimReward({ account }) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState(null);
  const [txId, setTxId] = useState(null);
  const [isRegistered, setIsRegistered] = useState(true); // Default to true since this component only shows for registered users
  const [isAlreadyGraded, setIsAlreadyGraded] = useState(false);
  const [isAlreadyRewarded, setIsAlreadyRewarded] = useState(false);

  useEffect(() => {
    checkStudentStatus();
  }, [account]);

  useEffect(() => {
    checkClaimStatus();
  }, [account]);

  const checkClaimStatus = async () => {
    if (!account) return;

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/submissions/${account.toLowerCase()}/claim-status`);
      
      if (response.ok) {
        const data = await response.json();
        setIsAlreadyRewarded(data.hasBeenRewarded);
        
        if (data.hasBeenRewarded) {
          setClaimStatus({
            type: 'success',
            message: '✅ You have already successfully claimed your reward! Tokens were distributed to your wallet.'
          });
        }
        
        console.log('Claim status:', data);
      }
    } catch (error) {
      console.error('Error checking claim status:', error);
    }
  };

  const handleClaimReward = async () => {
    if (!account) {
      setClaimStatus({ type: 'error', message: 'Wallet not connected' });
      return;
    }

    setIsClaiming(true);
    setClaimStatus(null);

    try {
      // Call the backend API to claim the reward
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/submissions/${account.toLowerCase()}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to claim reward');
      }

      setTxId(data.txId);
      setClaimStatus({
        type: 'success',
        message: data.txId === 'pending' ? 
          'Reward claim recorded! Note: Smart contract integration is pending - this is currently a demo.' :
          'Reward claim submitted! Transaction is being processed.'
      });

      // Refresh the claim status after a delay
      setTimeout(() => {
        checkClaimStatus();
      }, 3000);

    } catch (error) {
      console.error('Error claiming reward:', error);
      setClaimStatus({
        type: 'error',
        message: error.message || 'Failed to claim reward. Please try again.'
      });
    } finally {
      setIsClaiming(false);
    }
  };

  // Transaction monitoring is handled by the backend
  // No need for client-side transaction monitoring since the backend handles the claim

  const openExplorer = () => {
    if (txId && txId !== 'pending') {
      window.open(`https://explore-testnet.vechain.org/transactions/${txId}`, '_blank');
    }
  };

  if (!isRegistered) {
    return (
      <div className="reward-section">
        <h3>Student Registration Required</h3>
        <p>You need to register as a student first before you can claim rewards.</p>
        <div className="status-message info">
          Please register as a student by paying the 1 VET registration fee.
        </div>
      </div>
    );
  }

  if (isAlreadyRewarded) {
    return (
      <div className="reward-section">
        <h3>Reward Already Claimed</h3>
        <p>You have already claimed your B3TR token reward for this submission.</p>
        <div className="status-message success">
          Your B3TR tokens have been distributed to your wallet.
        </div>
      </div>
    );
  }

  return (
    <div className="reward-section">
      <h3>Congratulations! Your submission has been approved</h3>
      <p>You can now claim your B3TR token reward</p>
      
      {isAlreadyGraded && (
        <div className="status-message info">
          Your submission has already been graded. You can claim your reward below.
        </div>
      )}
      
      <button
        className="btn btn-success"
        onClick={handleClaimReward}
        disabled={isClaiming}
      >
        {isClaiming ? (
          <>
            <span className="loading"></span> Claiming Reward...
          </>
        ) : (
          'Claim Reward'
        )}
      </button>

      {claimStatus && (
        <div className={`status-message ${claimStatus.type}`}>
          {claimStatus.message}
          {txId && claimStatus.type === 'success' && (
            <div style={{ marginTop: '0.5rem' }}>
              <button
                onClick={openExplorer}
                style={{
                  background: 'transparent',
                  border: '1px solid currentColor',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                View on Explorer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ClaimReward;