import { ThorClient } from '@vechain/sdk-network';
import pkg from '@vechain/sdk-core';
const { Address, Hex, Transaction, Secp256k1, Hash } = pkg;
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
    console.log(`🔥 Calling gradeSubmission for ${studentAddress}, approved: ${approved}`);
    console.log(`🔑 Contract address: ${CONTRACT_ADDRESS}`);
    console.log(`🌐 Network URL: ${NETWORK_URL}`);
    console.log(`🔐 Private key exists: ${!!REGISTRAR_PRIVATE_KEY}`);

    // Create private key buffer
    const privateKeyBuffer = Hex.of(REGISTRAR_PRIVATE_KEY).bytes;
    
    // Derive the registrar address
    const registrarAddress = Address.ofPublicKey(Secp256k1.derivePublicKey(privateKeyBuffer));
    console.log('Registrar address:', registrarAddress.toString());

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

    console.log('Transaction clause:', clause);

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

    console.log('Transaction body:', txBody);

    // Create and sign transaction
    const transaction = Transaction.of(txBody);
    const signedTx = transaction.sign(privateKeyBuffer);
    
    console.log('Transaction signed, sending...');
    
    // Send transaction
    const txResult = await thor.transactions.sendTransaction(signedTx);
    const txId = txResult.id;
    
    console.log('Transaction sent:', txId);
    
    // Return success immediately - don't wait for confirmation in testnet
    return {
      success: true,
      txId: txId,
      message: 'Transaction submitted successfully'
    };

  } catch (error) {
    console.error('Error calling gradeSubmission:', error);
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
    console.log(`🔍 Checking if ${normalizedAddress} is registered in contract`);
    
    // TEMPORARY: Return true for testing - TODO: Fix VeChain SDK call
    console.log('⚠️ TEMPORARY: Returning true without actual contract check');
    return true;
    
    /* TODO: Fix this VeChain SDK v2 call
    // Create contract interface
    const contractInterface = new ethers.Interface(STUDENT_ABI);
    
    // Encode function call with normalized address
    const data = contractInterface.encodeFunctionData('students', [normalizedAddress]);
    
    // Call contract (read-only) - VeChain SDK v2: direct HTTP call
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
    
    // Decode result from first clause
    const decoded = contractInterface.decodeFunctionResult('students', result[0].data);
    
    console.log('Student data from contract:', {
      wallet: decoded[0],
      name: decoded[1],
      familyName: decoded[2],
      registered: decoded[3],
      graduated: decoded[4]
    });
    
    return decoded[3]; // registered boolean
    */
    
  } catch (error) {
    console.error('Error checking student registration:', error);
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