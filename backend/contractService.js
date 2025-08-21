import { ThorClient } from '@vechain/sdk-network';
import pkg from '@vechain/sdk-core';
const { Address, Hex, TransactionHandler, unitsUtils, secp256k1 } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Contract configuration
const CONTRACT_ADDRESS = '0xa56903cf66bacca8fb5911eb759a8566bda978ac';
const NETWORK_URL = 'https://testnet.vechain.org/';
const REGISTRAR_PRIVATE_KEY = process.env.VECHAIN_PRIVATE_KEY;

// Contract ABI for gradeSubmission function
const GRADE_SUBMISSION_ABI = {
  name: 'gradeSubmission',
  type: 'function',
  inputs: [
    { name: 'studentAddress', type: 'address' },
    { name: 'approved', type: 'bool' }
  ],
  outputs: [],
  stateMutability: 'nonpayable'
};

// Initialize VeChain SDK
const thor = ThorClient.fromUrl(NETWORK_URL);

export async function gradeSubmissionOnChain(studentAddress, approved) {
  try {
    console.log(`Calling gradeSubmission for ${studentAddress}, approved: ${approved}`);

    // Create private key buffer
    const privateKeyBuffer = Hex.of(REGISTRAR_PRIVATE_KEY).bytes;
    
    // Derive the registrar address
    const registrarAddress = Address.ofPublicKey(secp256k1.derivePublicKey(privateKeyBuffer));
    console.log('Registrar address:', registrarAddress.toString());

    // Get the latest block
    const bestBlock = await thor.blocks.getBestBlockCompressed();
    
    // Create transaction clause
    const clause = {
      to: CONTRACT_ADDRESS,
      value: '0x0',
      data: thor.contracts.encodeFunctionInput(GRADE_SUBMISSION_ABI, [studentAddress, approved])
    };

    console.log('Transaction clause:', clause);

    // Build transaction
    const txBody = {
      chainTag: bestBlock.id.slice(-2),
      blockRef: bestBlock.id.slice(0, 18),
      expiration: 32,
      clauses: [clause],
      gasPriceCoef: 0,
      gas: 200000,
      dependsOn: null,
      nonce: Date.now().toString()
    };

    console.log('Transaction body:', txBody);

    // Sign and send transaction
    const signedTx = TransactionHandler.sign(txBody, privateKeyBuffer);
    const txId = await thor.transactions.sendTransaction(signedTx);
    
    console.log('Transaction sent:', txId);
    
    // Wait for transaction receipt
    const receipt = await waitForTransaction(txId);
    
    if (receipt && !receipt.reverted) {
      console.log('Transaction successful:', txId);
      return {
        success: true,
        txId: txId,
        receipt: receipt
      };
    } else {
      console.error('Transaction reverted:', receipt);
      return {
        success: false,
        txId: txId,
        error: 'Transaction was reverted'
      };
    }

  } catch (error) {
    console.error('Error calling gradeSubmission:', error);
    return {
      success: false,
      error: error.message
    };
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