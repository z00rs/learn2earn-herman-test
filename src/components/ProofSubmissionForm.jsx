import React, { useState } from 'react';
import { useWallet, useSendTransaction, useTransactionModal } from '@vechain/vechain-kit';
import { ethers } from 'ethers';
import { submitProof } from '../services/api';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';

function ProofSubmissionForm({ account, onSubmissionSuccess, disabled }) {
  const { account: walletAccount } = useWallet();
  const { open: openTransactionModal } = useTransactionModal();
  
  const [formData, setFormData] = useState({
    name: '',
    proofLink: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const currentAccount = walletAccount?.address || account;

  // Setup transaction hook for on-chain submitProof
  const {
    sendTransaction,
    isTransactionPending,
    txReceipt,
  } = useSendTransaction({
    signerAccountAddress: currentAccount ?? '',
    onTxConfirmed: async () => {
      console.log('✅ On-chain submitProof confirmed');
      // Now save to backend
      try {
        await submitProof({
          walletAddress: account.toLowerCase(),
          name: formData.name,
          proofLink: formData.proofLink
        });
        
        setSuccess(true);
        setFormData({ name: '', proofLink: '' });
        onSubmissionSuccess();
        
        setTimeout(() => setSuccess(false), 5000);
      } catch (err) {
        setError('On-chain success but backend failed: ' + err.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    onTxFailedOrCancelled: (error) => {
      console.error('❌ On-chain submitProof failed:', error);
      setError(error?.reason || error?.message || 'Transaction failed');
      setIsSubmitting(false);
    }
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.proofLink.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!formData.proofLink.startsWith('http://') && !formData.proofLink.startsWith('https://')) {
      setError('Please enter a valid URL for the proof link');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Step 1: Call contract submitProof() on-chain
      const iface = new ethers.Interface(CONTRACT_ABI);
      const data = iface.encodeFunctionData('submitProof', [formData.proofLink]);

      const transactionClauses = [{
        to: CONTRACT_ADDRESS,
        value: '0',
        data: data,
        comment: `Submit proof: ${formData.proofLink}`,
      }];

      console.log('📤 Sending on-chain submitProof...');
      openTransactionModal();
      await sendTransaction(transactionClauses);
      
      // Step 2 happens in onTxConfirmed callback
      
    } catch (err) {
      setError(err.message || 'Failed to submit proof. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter your name"
          disabled={disabled || isSubmitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="proofLink">Proof Link</label>
        <input
          type="url"
          id="proofLink"
          name="proofLink"
          value={formData.proofLink}
          onChange={handleChange}
          placeholder="https://github.com/yourrepo or screenshot link"
          disabled={disabled || isSubmitting}
        />
      </div>

      <button 
        type="submit" 
        className="btn" 
        disabled={disabled || isSubmitting || !account}
      >
        {isSubmitting ? (
          <>
            <span className="loading"></span> Submitting...
          </>
        ) : (
          'Submit Proof'
        )}
      </button>

      {error && (
        <div className="status-message error">
          {error}
        </div>
      )}

      {success && (
        <div className="status-message success">
          Proof submitted successfully! Waiting for moderator approval.
        </div>
      )}

      {disabled && (
        <div className="status-message info">
          You have already submitted your proof. Please wait for approval.
        </div>
      )}
    </form>
  );
}

export default ProofSubmissionForm;