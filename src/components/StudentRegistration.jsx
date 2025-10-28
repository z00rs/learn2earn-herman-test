import React, { useState, useMemo } from 'react';
import { useWallet, useSendTransaction, useTransactionModal } from '@vechain/vechain-kit';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';

function StudentRegistration({ account, onRegistrationSuccess, onRegistrationStatusChange }) {
  const { account: walletAccount } = useWallet();
  const { open: openTransactionModal } = useTransactionModal();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: ''
  });

  // Create transaction clauses using VeChain Kit pattern
  const transactionClauses = useMemo(() => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return [];
    }

    // Find the addStudent function ABI
    const addStudentABI = CONTRACT_ABI.find(fn => fn.name === 'addStudent');
    if (!addStudentABI) {
      return [];
    }

    try {
      // Create contract interface for proper ABI encoding
      const iface = new ethers.Interface(CONTRACT_ABI);
      
      // Encode the function call with parameters
      const firstName = formData.firstName.trim();
      const lastName = formData.lastName.trim();
      const data = iface.encodeFunctionData('addStudent', [firstName, lastName]);

      return [{
        to: CONTRACT_ADDRESS,
        value: '1000000000000000000', // 1 VET in wei (decimal string)
        data: data,
        comment: `Register as Learn2Earn Student: ${firstName} ${lastName}`,
        abi: addStudentABI,
      }];
    } catch (error) {
      console.error('Error encoding transaction data:', error);
      return [];
    }
  }, [formData.firstName, formData.lastName]);

  // Get the current account address
  const currentAccount = walletAccount?.address || account;
  
  // Setup the transaction hook with enhanced debugging
  const {
    sendTransaction,
    isTransactionPending,
    status,
    error: transactionError,
    txReceipt,
  } = useSendTransaction({
    signerAccountAddress: currentAccount ?? '',
    onTxConfirmed: async () => {
      
      // Clear cache after successful registration
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        await fetch(`${API_BASE_URL}/clear-cache/${currentAccount.toLowerCase()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Cache cleared after registration');
      } catch (error) {
        console.log('⚠️ Could not clear cache, but registration succeeded');
      }
      
      setRegistrationStatus({
        type: 'success',
        message: 'Successfully registered as a student! You can now submit proofs.'
      });
      if (onRegistrationSuccess) {
        setTimeout(onRegistrationSuccess, 2000);
      }
    },
    onTxFailedOrCancelled: async (error) => {
      
      // Check if this is a "already registered" error
      if (error?.reason === 'Transaction reverted with: You are already registered.') {
        // Clear cache for already registered users too
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          await fetch(`${API_BASE_URL}/clear-cache/${currentAccount.toLowerCase()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          console.log('✅ Cache cleared for already registered user');
        } catch (error) {
          console.log('⚠️ Could not clear cache');
        }
        
        setRegistrationStatus({
          type: 'info',
          message: '✅ You are already registered as a student! You can submit proofs.'
        });
        if (onRegistrationSuccess) {
          setTimeout(onRegistrationSuccess, 1000);
        }
        return;
      }
      
      setRegistrationStatus({
        type: 'error',
        message: error?.reason || error?.message || 'Transaction failed or was cancelled.'
      });
    }
  });

  // Monitor transaction status changes (minimal logging)
  React.useEffect(() => {
    // Handle case where we have a receipt but status is error due to revert
    if (txReceipt && status === 'error' && transactionError?.reason === 'Transaction reverted with: You are already registered.') {
      // Clear cache for already registered users
      const clearCache = async () => {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          await fetch(`${API_BASE_URL}/clear-cache/${currentAccount.toLowerCase()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          console.log('✅ Cache cleared for already registered user (useEffect)');
        } catch (error) {
          console.log('⚠️ Could not clear cache (useEffect)');
        }
      };
      clearCache();
      
      setRegistrationStatus({
        type: 'info',
        message: '✅ You are already registered as a student! You can submit proofs.'
      });
      if (onRegistrationSuccess) {
        setTimeout(onRegistrationSuccess, 1000);
      }
    }
  }, [status, isTransactionPending, transactionError, txReceipt, onRegistrationSuccess, currentAccount]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setRegistrationStatus({
        type: 'error',
        message: 'Please fill in both first name and last name'
      });
      return;
    }

    if (!currentAccount || currentAccount === '*') {
      setRegistrationStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    if (transactionClauses.length === 0) {
      setRegistrationStatus({ type: 'error', message: 'Transaction not ready. Please check form data.' });
      return;
    }

    setIsRegistering(true);
    setRegistrationStatus({
      type: 'info',
      message: '🔄 Preparing registration transaction...'
    });

    try {

      // Open the transaction modal (VeChain Kit UI)
      openTransactionModal();
      
      // Send the transaction using VeChain Kit (ignore gas estimation errors - they don't prevent success)
      await sendTransaction(transactionClauses);
      
      setRegistrationStatus({
        type: 'info',
        message: '⏳ Transaction submitted, waiting for confirmation...'
      });

      
      // The success/failure handling is done in the useSendTransaction callbacks
      
    } catch (error) {
      setRegistrationStatus({
        type: 'error',
        message: error.message || 'Transaction failed. Please try again.'
      });
    } finally {
      setIsRegistering(false);
    }
  };



  return (
    <div className="card">
      <h2>Student Registration</h2>
      <p>Register as a student to participate in the Learn2Earn program. Registration fee: 1 VET</p>
      
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Enter your first name"
            disabled={isRegistering}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Enter your last name"
            disabled={isRegistering}
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn" 
          disabled={isRegistering || !currentAccount}
        >
          {isRegistering ? (
            <>
              <span className="loading"></span> Registering...
            </>
          ) : (
            'Register (1 VET)'
          )}
        </button>


        {registrationStatus && (
          <div className={`status-message ${registrationStatus.type}`}>
            {registrationStatus.message}
            
            {/* Show explorer link if we have a receipt */}
            {txReceipt && (
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.open(`https://explore-testnet.vechain.org/transactions/${txReceipt.meta?.txID}`, '_blank')}
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
            
            {/* Show manual check option if waiting for confirmation */}
            {registrationStatus.type === 'info' && registrationStatus.message.includes('waiting for confirmation') && (
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    // Clear cache and mark as complete, but don't set final claimed state
                    const clearCacheAndComplete = async () => {
                      try {
                        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                        await fetch(`${API_BASE_URL}/clear-cache/${currentAccount.toLowerCase()}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        console.log('✅ Cache cleared manually');
                      } catch (error) {
                        console.log('⚠️ Could not clear cache manually');
                      }
                    };
                    clearCacheAndComplete();
                    
                    setRegistrationStatus({
                      type: 'success',
                      message: '✅ Registration completed! Please wait for blockchain confirmation, then you can submit your proof.'
                    });
                    if (onRegistrationSuccess) {
                      setTimeout(onRegistrationSuccess, 500); // Faster transition
                    }
                  }}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    marginLeft: '0.5rem'
                  }}
                >
                  ✓ Continue to Next Step
                </button>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                  Click if your transaction was confirmed in VeWorld or you want to proceed
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

export default StudentRegistration;