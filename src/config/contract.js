export const CONTRACT_ADDRESS = '0xa56903cf66bacca8fb5911eb759a8566bda978ac';

export const CONTRACT_ABI = [
  {
    name: 'addStudent',
    type: 'function',
    inputs: [
      { name: '_name', type: 'string' },
      { name: '_familyName', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'payable'
  },
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
    name: 'gradeSubmission',
    type: 'function',
    inputs: [
      { name: 'studentAddress', type: 'address' },
      { name: 'approved', type: 'bool' }
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