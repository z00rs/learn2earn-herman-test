import React, { useState } from 'react';
import { useConnex } from '@vechain/dapp-kit-react';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';

function StudentRegistration({ account, onRegistrationSuccess }) {
  const connex = useConnex();
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [txId, setTxId] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: ''
  });

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

    if (!connex) {
      setRegistrationStatus({ type: 'error', message: 'Wallet not connected' });
      return;
    }

    setIsRegistering(true);
    setRegistrationStatus(null);

    try {
      // First check if already registered
      const studentsMethod = connex.thor.account(CONTRACT_ADDRESS).method({
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
      });

      const studentResult = await studentsMethod.call(account);
      if (studentResult.decoded.registered) {
        setRegistrationStatus({
          type: 'error',
          message: 'You are already registered as a student!'
        });
        return;
      }

      // Find the addStudent function ABI
      const addStudentABI = CONTRACT_ABI.find(fn => fn.name === 'addStudent');
      
      if (!addStudentABI) {
        throw new Error('addStudent function not found in ABI');
      }

      console.log('Registration ABI:', addStudentABI);
      console.log('Form data:', formData);

      // Create the method using Connex
      const method = connex.thor.account(CONTRACT_ADDRESS).method(addStudentABI);
      
      // Encode the function call with parameters and 1 VET value
      const clause = method.asClause(formData.firstName.trim(), formData.lastName.trim());
      clause.value = '1000000000000000000'; // 1 VET in wei

      console.log('Registration clause:', clause);
      console.log('Contract address:', CONTRACT_ADDRESS);
      console.log('Account:', account);

      const tx = connex.vendor.sign('tx', [clause])
        .signer(account)
        .comment('Register as Learn2Earn Student')
        .gas(200000); // Set explicit gas limit

      const result = await tx.request();
      
      if (result) {
        setTxId(result.txid);
        setRegistrationStatus({
          type: 'success',
          message: 'Registration submitted! Transaction is being processed.'
        });
        
        await waitForTransaction(result.txid);
      }
    } catch (error) {
      console.error('Error registering student:', error);
      setRegistrationStatus({
        type: 'error',
        message: error.message || 'Failed to register. Please try again.'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const waitForTransaction = async (txId) => {
    const ticker = connex.thor.ticker();
    
    for (let i = 0; i < 10; i++) {
      await ticker.next();
      const receipt = await connex.thor.transaction(txId).getReceipt();
      
      if (receipt) {
        if (receipt.reverted) {
          setRegistrationStatus({
            type: 'error',
            message: 'Transaction reverted. Please check your balance and try again.'
          });
        } else {
          setRegistrationStatus({
            type: 'success',
            message: 'Successfully registered as a student! You can now submit proofs.'
          });
          // Call the parent component to refresh the student status
          if (onRegistrationSuccess) {
            setTimeout(onRegistrationSuccess, 2000);
          }
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
          disabled={isRegistering || !account}
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
            {txId && registrationStatus.type === 'success' && (
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
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
      </form>
    </div>
  );
}

export default StudentRegistration;