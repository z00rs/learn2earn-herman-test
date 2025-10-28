export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0b24b44cf0742500545124fcfeadda297e188b97';

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