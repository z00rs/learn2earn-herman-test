import React, { useState, useMemo } from 'react';
import { useWallet, useSendTransaction, useTransactionModal } from '@vechain/vechain-kit';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { log, warn, error, info, logEvent, maskAddress } from '../utils/logger';

function StudentRegistration({ account, onRegistrationSuccess, onRegistrationStatusChange }) {
  const { account: walletAccount } = useWallet();
  const { open: openTransactionModal } = useTransactionModal();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [callbackCalled, setCallbackCalled] = useState(false); // Prevent multiple callback calls
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
      error('Error encoding transaction data:', error);
      return [];
    }
  }, [formData.firstName, formData.lastName]);

  // Get the current account address
  const currentAccount = walletAccount?.address || account;
  
  // Reset callback flag when account changes
  React.useEffect(() => {
    setCallbackCalled(false);
    logEvent('🔄 StudentRegistration: Reset callback flag for new account', { currentAccount });
  }, [currentAccount]);
  
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
        log('✅ Cache cleared after registration');
      } catch (error) {
        log('⚠️ Could not clear cache, but registration succeeded');
      }
      
      setRegistrationStatus({
        type: 'success',
        message: 'Successfully registered as a student! You can now submit proofs.'
      });
      if (onRegistrationSuccess && !callbackCalled) {
        setCallbackCalled(true);
        setTimeout(() => {
          log('🎯 StudentRegistration: Calling onRegistrationSuccess');
          onRegistrationSuccess();
        }, 2000);
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
          log('✅ Cache cleared for already registered user');
        } catch (error) {
          log('⚠️ Could not clear cache');
        }
        
        setRegistrationStatus({
          type: 'info',
          message: '✅ You are already registered as a student! You can submit proofs.'
        });
        if (onRegistrationSuccess && !callbackCalled) {
          setCallbackCalled(true);
          setTimeout(() => {
            log('🎯 StudentRegistration: Already registered (onTxFailedOrCancelled), calling onRegistrationSuccess');
            onRegistrationSuccess();
          }, 1500);
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
          log('✅ Cache cleared for already registered user (useEffect)');
        } catch (error) {
          log('⚠️ Could not clear cache (useEffect)');
        }
      };
      clearCache();
      
      setRegistrationStatus({
        type: 'info',
        message: '✅ You are already registered as a student! You can submit proofs.'
      });
      if (onRegistrationSuccess && !callbackCalled) {
        setCallbackCalled(true);
        setTimeout(() => {
          log('🎯 StudentRegistration: Already registered (useEffect), calling onRegistrationSuccess');
          onRegistrationSuccess();
        }, 1500);
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
                  onClick={async () => {
                    // Clear cache and check REAL registration status before proceeding
                    setRegistrationStatus({
                      type: 'info',
                      message: '🔄 Checking registration status in contract...'
                    });
                    
                    try {
                      // Clear cache only once
                      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                      await fetch(`${API_BASE_URL}/clear-cache/${currentAccount.toLowerCase()}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      log('✅ Cache cleared for registration check');
                      
                      // Wait a moment for cache to clear
                      await new Promise(resolve => setTimeout(resolve, 500));
                      
                      // Check actual registration status directly (bypassing frequent request limits)
                      const statusResponse = await fetch(`${API_BASE_URL}/submissions/${currentAccount.toLowerCase()}/status`);
                      if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        log('🔍 Registration check result:', statusData);
                        
                        if (statusData.isRegistered) {
                          setRegistrationStatus({
                            type: 'success',
                            message: '✅ Registration confirmed in contract! You can now submit your proof.'
                          });
                          if (onRegistrationSuccess && !callbackCalled) {
                            setCallbackCalled(true);
                            setTimeout(() => {
                              log('🎯 StudentRegistration: Manual check confirmed registration, calling onRegistrationSuccess');
                              onRegistrationSuccess();
                            }, 1500);
                          }
                        } else {
                          setRegistrationStatus({
                            type: 'warning',
                            message: '⚠️ Registration not yet confirmed in contract. Please wait a bit more or try registering again.'
                          });
                        }
                      } else {
                        throw new Error('Could not check status');
                      }
                    } catch (error) {
                      error('Error checking registration status:', error);
                      setRegistrationStatus({
                        type: 'error',
                        message: '❌ Could not verify registration status. Please try again or refresh the page.'
                      });
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
                  ✓ Check Registration & Continue
                </button>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                  Click to verify your registration status in the contract
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