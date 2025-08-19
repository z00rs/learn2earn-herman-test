export const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

export const CONTRACT_ABI = [
  {
    name: 'submitProof',
    type: 'function',
    inputs: [
      { name: 'proof', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'isGraded',
    type: 'function',
    inputs: [
      { name: 'studentAddress', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'isRewarded',
    type: 'function',
    inputs: [
      { name: 'studentAddress', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'getSubmission',
    type: 'function',
    inputs: [
      { name: 'studentAddress', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'string' }
    ],
    stateMutability: 'view'
  }
];