import React, { useState, useEffect } from 'react';
import { useConnex } from '@vechain/dapp-kit-react';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';

function ClaimReward({ account }) {
  const connex = useConnex();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState(null);
  const [txId, setTxId] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isAlreadyGraded, setIsAlreadyGraded] = useState(false);
  const [isAlreadyRewarded, setIsAlreadyRewarded] = useState(false);

  useEffect(() => {
    checkStudentStatus();
  }, [account, connex]);

  const checkStudentStatus = async () => {
    if (!connex || !account) return;

    try {
      // Check if student is registered
      const studentsMethod = connex.thor.account(CONTRACT_ADDRESS).method({
        name: 'students',
        type: 'function',
        inputs: [{ name: '', type: 'address' }],
        outputs: [
          { name: 'wallet', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'familyName', type: 'string' },
          { name: 'registered', type: 'bool' },
          { name: 'graduated', type: 'bool' },
          { name: 'certificate', type: 'bytes32' }
        ],
        stateMutability: 'view'
      });

      const studentResult = await studentsMethod.call(account);
      setIsRegistered(studentResult.decoded.registered);

      // Check if already graded
      const isGradedMethod = connex.thor.account(CONTRACT_ADDRESS).method({
        name: 'isGraded',
        type: 'function',
        inputs: [{ name: 'studentAddress', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view'
      });

      const gradedResult = await isGradedMethod.call(account);
      setIsAlreadyGraded(gradedResult.decoded[0]);

      // Check if already rewarded
      const isRewardedMethod = connex.thor.account(CONTRACT_ADDRESS).method({
        name: 'isRewarded',
        type: 'function',
        inputs: [{ name: 'studentAddress', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view'
      });

      const rewardedResult = await isRewardedMethod.call(account);
      setIsAlreadyRewarded(rewardedResult.decoded[0]);

      console.log('Student status:', {
        registered: studentResult.decoded.registered,
        graded: gradedResult.decoded[0],
        rewarded: rewardedResult.decoded[0]
      });
    } catch (error) {
      console.error('Error checking student status:', error);
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

      // Refresh the student status after a delay
      setTimeout(() => {
        checkStudentStatus();
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

  const waitForTransaction = async (txId) => {
    const ticker = connex.thor.ticker();
    
    for (let i = 0; i < 10; i++) {
      await ticker.next();
      const receipt = await connex.thor.transaction(txId).getReceipt();
      
      if (receipt) {
        if (receipt.reverted) {
          setClaimStatus({
            type: 'error',
            message: 'Transaction reverted. Please check if you are eligible for rewards.'
          });
        } else {
          setClaimStatus({
            type: 'success',
            message: 'Reward successfully claimed! B3TR tokens have been sent to your wallet.'
          });
        }
        break;
      }
    }
  };

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