import React, { useState, useEffect } from 'react';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';

function ClaimReward({ account }) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState(null);
  const [txId, setTxId] = useState(null);
  const [isRegistered, setIsRegistered] = useState(true); // Default to true since this component only shows for registered users
  const [isAlreadyGraded, setIsAlreadyGraded] = useState(false);
  const [isAlreadyRewarded, setIsAlreadyRewarded] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(0);

  useEffect(() => {
    // Only check status once when account changes
    if (account) {
      checkStudentStatus();
    }
  }, [account]);

  const checkStudentStatus = async () => {
    if (!account) return;
    
    // Prevent frequent requests - check no more than once every 5 seconds
    const now = Date.now();
    if (now - lastCheckTime < 5000) {
      console.log('⏰ ClaimReward: Skipping status check - too early');
      return;
    }
    setLastCheckTime(now);
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/submissions/${account.toLowerCase()}/status`);
      
      if (response.ok) {
        const status = await response.json();
        console.log('🎯 ClaimReward: Student status:', status);
        
        setIsRegistered(status.isRegistered);
        setIsAlreadyRewarded(status.isRewarded);
        
        // Check if there's a previous transaction hash from submission
        if (status.submission && status.submission.transaction_hash) {
          setTxId(status.submission.transaction_hash);
        }
        
        if (status.isRewarded) {
          setClaimStatus({
            type: 'success',
            message: '✅ You have already successfully claimed your reward! B3TR tokens were distributed to your wallet.'
          });
        } else if (status.submission && status.submission.transaction_hash) {
          // Show status of previous transaction attempt
          setClaimStatus({
            type: 'info',
            message: '📋 Previous claim transaction found. Check transaction status below.'
          });
        }
      }
    } catch (error) {
      console.error('Error checking student status:', error);
    }
  };

  // Remove duplicate useEffect
  // useEffect(() => {
  //   checkClaimStatus();
  // }, [account]);

  const checkClaimStatus = async () => {
    if (!account) return;

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/submissions/${account.toLowerCase()}/status`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if user has been rewarded according to contract
        if (data.isRewarded) {
          setIsAlreadyRewarded(true);
          setClaimStatus({
            type: 'success',
            message: '✅ You have already successfully claimed your reward! B3TR tokens were distributed to your wallet.'
          });
        } else if (data.submission && data.submission.claimed) {
          // Check if there was a previous failed attempt
          setClaimStatus({
            type: 'warning', 
            message: '⚠️ Previous claim attempt failed. You can try claiming again.'
          });
        }
        
        console.log('🎯 ClaimReward: Claim status:', data);
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

    if (isAlreadyRewarded) {
      setClaimStatus({ 
        type: 'info', 
        message: 'You have already claimed your reward!' 
      });
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
        if (data.message && data.message.includes('already rewarded')) {
          setIsAlreadyRewarded(true);
          setClaimStatus({
            type: 'success',
            message: '✅ You have already claimed your reward! B3TR tokens are in your wallet.'
          });
        } else {
          throw new Error(data.message || 'Failed to claim reward');
        }
      } else {
        // Always extract txId if present
        if (data.txId) {
          setTxId(data.txId);
        }
        
        if (data.success) {
          setClaimStatus({
            type: 'success',
            message: `✅ Reward transaction submitted! Please check transaction status on explorer.`
          });
          
          // Don't mark as rewarded immediately - let the blockchain confirm first
          // setIsAlreadyRewarded(true);
        } else {
          setClaimStatus({
            type: 'error',
            message: data.error || data.message || 'Transaction failed. You can try again.'
          });
        }
      }

      // Refresh the claim status after a delay
      setTimeout(() => {
        setLastCheckTime(0); // Reset time for forced check
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
        disabled={isClaiming || isAlreadyRewarded}
      >
        {isClaiming ? (
          <>
            <span className="loading"></span> Submitting Transaction...
          </>
        ) : isAlreadyRewarded ? (
          'Reward Already Claimed'
        ) : (
          'Claim Reward'
        )}
      </button>

      {claimStatus && (
        <div className={`status-message ${claimStatus.type}`}>
          {claimStatus.message}
          {txId && txId !== 'pending' && (
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
                View Transaction on Explorer
              </button>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>
                TX: {txId}
              </div>
            </div>
          )}
        </div>
      )}
      
      {txId && !claimStatus && (
        <div className="status-message info">
          <div style={{ marginBottom: '0.5rem' }}>
            📋 Previous transaction found. Check status on explorer:
          </div>
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
            View Transaction on Explorer
          </button>
          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>
            TX: {txId}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClaimReward;