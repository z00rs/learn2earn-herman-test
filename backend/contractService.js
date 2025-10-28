import { ThorClient } from '@vechain/sdk-network';
import pkg from '@vechain/sdk-core';
const { Address, Hex, Transaction, Secp256k1, Hash } = pkg;
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { log, warn, error, info, logEvent, checkEnvVar, maskAddress, maskTxId } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Contract configuration
const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS;
const NETWORK_URL = 'https://testnet.vechain.org/';
const REGISTRAR_PRIVATE_KEY = process.env.VECHAIN_PRIVATE_KEY;

// Contract ABI for gradeSubmission function
const GRADE_SUBMISSION_ABI = [{
  name: 'gradeSubmission',
  type: 'function',
  inputs: [
    { name: 'studentAddress', type: 'address' },
    { name: 'approved', type: 'bool' }
  ],
  outputs: [],
  stateMutability: 'nonpayable'
}];

// Contract ABI for checking student registration
const STUDENT_ABI = [{
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
}];

// Initialize VeChain SDK
const thor = ThorClient.fromUrl(NETWORK_URL);

export async function gradeSubmissionOnChain(studentAddress, approved) {
  try {
    logEvent('🔥 Calling gradeSubmission', { 
      studentAddress, 
      approved,
      contractExists: !!CONTRACT_ADDRESS,
      networkUrl: NETWORK_URL,
      privateKeyExists: !!REGISTRAR_PRIVATE_KEY
    });

    // Create private key buffer
    const privateKeyBuffer = Hex.of(REGISTRAR_PRIVATE_KEY).bytes;
    
    // Derive the registrar address
    const registrarAddress = Address.ofPublicKey(Secp256k1.derivePublicKey(privateKeyBuffer));
    logEvent('Registrar address derived', { registrarAddress: registrarAddress.toString() });

    // Get the latest block
    const bestBlock = await thor.blocks.getBestBlockCompressed();
    
    // Encode function call data using ethers.js
    const contractInterface = new ethers.Interface(GRADE_SUBMISSION_ABI);
    const data = contractInterface.encodeFunctionData('gradeSubmission', [studentAddress, approved]);
    
    // Create transaction clause
    const clause = {
      to: CONTRACT_ADDRESS,
      value: '0x0',
      data: data
    };

    log('Transaction clause created');

    // Build transaction body
    const txBody = {
      chainTag: 0x27, // VeChain testnet chain tag
      blockRef: bestBlock.id.slice(0, 18),
      expiration: 32,
      clauses: [clause],
      gasPriceCoef: 0,
      gas: 200000,
      dependsOn: null,
      nonce: parseInt(Date.now().toString())
    };

    log('Transaction body prepared');

    // Create and sign transaction
    const transaction = Transaction.of(txBody);
    const signedTx = transaction.sign(privateKeyBuffer);
    
    log('Transaction signed, sending...');
    
    // Send transaction
    const txResult = await thor.transactions.sendTransaction(signedTx);
    const txId = txResult.id;
    
    logEvent('Transaction sent', { txId });
    
    // Return success immediately - don't wait for confirmation in testnet
    return {
      success: true,
      txId: txId,
      message: 'Transaction submitted successfully'
    };

  } catch (error) {
    error('Error calling gradeSubmission:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// NEW: Function to check if student is registered in the contract
export async function isStudentRegistered(studentAddress) {
  try {
    // ✅ Normalize address to lowercase (VeChain uses lowercase internally)
    const normalizedAddress = studentAddress.toLowerCase();
    logEvent('🔍 Checking if student is registered in contract', { studentAddress: normalizedAddress });
    
    // Create contract interface for students mapping
    const contractInterface = new ethers.Interface(STUDENT_ABI);
    
    // Encode function call with normalized address
    const data = contractInterface.encodeFunctionData('students', [normalizedAddress]);
    
    // Call contract (read-only) using VeChain API
    const response = await fetch(`${NETWORK_URL}accounts/*`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clauses: [{
          to: CONTRACT_ADDRESS,
          value: '0x0',
          data: data
        }]
      })
    });
    
    const result = await response.json();
    
    if (result && result[0] && result[0].data) {
      // Decode result from first clause
      const decoded = contractInterface.decodeFunctionResult('students', result[0].data);
      
      log('Student data from contract retrieved');
      
      return decoded[3]; // registered boolean
    }
    
    warn('Could not check registration, assuming not registered');
    return false;
    
  } catch (error) {
    error('Error checking student registration:', error);
    return false;
  }
}

// Check transaction status and get detailed error information
export async function checkTransactionStatus(txId) {
  try {
    logEvent('🔍 Checking transaction status', { txId });
    
    // Get transaction receipt
    const receipt = await thor.transactions.getTransactionReceipt(txId);
    
    if (!receipt) {
      return {
        status: 'pending',
        message: 'Transaction is still pending or not found'
      };
    }
    
    // Check if transaction was reverted
    if (receipt.reverted) {
      // Get transaction details for more info
      const tx = await thor.transactions.getTransaction(txId);
      
      return {
        status: 'failed',
        message: `Transaction failed. Please check the transaction on explorer: https://explore-testnet.vechain.org/transactions/${txId}`,
        receipt: receipt,
        transaction: tx,
        explorerUrl: `https://explore-testnet.vechain.org/transactions/${txId}`
      };
    }
    
    return {
      status: 'success',
      message: 'Transaction completed successfully',
      receipt: receipt,
      explorerUrl: `https://explore-testnet.vechain.org/transactions/${txId}`
    };
    
  } catch (error) {
    error('❌ Error checking transaction status:', error);
    return {
      status: 'error',
      message: `Error checking transaction: ${error.message}`
    };
  }
}

// Check if student has already been rewarded by looking at contract state
export async function hasStudentBeenRewarded(walletAddress) {
  try {
    logEvent('🔍 Checking if student has been rewarded', { walletAddress });
    
    // Create contract interface for isRewarded mapping
    const rewardABI = [{
      name: 'isRewarded',
      type: 'function',
      inputs: [{ name: '', type: 'address' }],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'view'
    }];
    
    const contractInterface = new ethers.Interface(rewardABI);
    const data = contractInterface.encodeFunctionData('isRewarded', [walletAddress.toLowerCase()]);
    
    // Call contract to check reward status
    const response = await fetch(`${NETWORK_URL}accounts/*`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clauses: [{
          to: CONTRACT_ADDRESS,
          value: '0x0',
          data: data
        }]
      })
    });
    
    const result = await response.json();
    
    if (result && result[0] && result[0].data) {
      // Decode result from first clause
      const decoded = contractInterface.decodeFunctionResult('isRewarded', result[0].data);
      const hasBeenRewarded = decoded[0];
      
      logEvent('💰 Reward status checked', { 
        walletAddress, 
        hasBeenRewarded: hasBeenRewarded ? 'ALREADY_REWARDED' : 'NOT_YET_REWARDED' 
      });
      return hasBeenRewarded;
    }
    
    warn('Could not check reward status, assuming not rewarded');
    return false;
    
  } catch (error) {
    error('❌ Error checking reward status:', error);
    return false;
  }
}

async function waitForTransaction(txId, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await thor.transactions.getTransactionReceipt(txId);
      if (receipt) {
        return receipt;
      }
    } catch (error) {
      // Transaction not found yet, continue waiting
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Transaction timeout');
}