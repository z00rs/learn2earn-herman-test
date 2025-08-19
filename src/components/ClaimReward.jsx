import React, { useState } from 'react';
import { useConnex } from '@vechain/dapp-kit-react';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';

function ClaimReward({ account }) {
  const connex = useConnex();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState(null);
  const [txId, setTxId] = useState(null);

  const handleClaimReward = async () => {
    if (!connex) {
      setClaimStatus({ type: 'error', message: 'Wallet not connected' });
      return;
    }

    setIsClaiming(true);
    setClaimStatus(null);

    try {
      const clause = {
        to: CONTRACT_ADDRESS,
        value: 0,
        data: CONTRACT_ABI.find(fn => fn.name === 'claimReward').encode()
      };

      const tx = connex.vendor.sign('tx', [clause])
        .signer(account)
        .comment('Claim Learn2Earn Reward');

      const result = await tx.request();
      
      if (result) {
        setTxId(result.txid);
        setClaimStatus({
          type: 'success',
          message: 'Reward claimed successfully! Transaction is being processed.'
        });
        
        await waitForTransaction(result.txid);
      }
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
    if (txId) {
      window.open(`https://explore.vechain.org/transactions/${txId}`, '_blank');
    }
  };

  return (
    <div className="reward-section">
      <h3>Congratulations! Your submission has been approved</h3>
      <p>You can now claim your B3TR token reward</p>
      
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