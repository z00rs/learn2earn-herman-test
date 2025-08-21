import React, { useState, useEffect } from 'react';
import { DAppKitProvider, useConnex } from '@vechain/dapp-kit-react';
import WalletConnection from './components/WalletConnection';
import StudentRegistration from './components/StudentRegistration';
import ProofSubmissionForm from './components/ProofSubmissionForm';
import ClaimReward from './components/ClaimReward';
import { checkSubmissionStatus } from './services/api';
import { CONTRACT_ADDRESS } from './config/contract';

const nodeUrl = 'https://testnet.vechain.org/';
const genesis = 'test';

function AppContent() {
  const connex = useConnex();
  const [account, setAccount] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (account && connex) {
      checkStatus();
      checkRegistrationStatus();
    }
  }, [account, connex]);

  const checkStatus = async () => {
    try {
      const status = await checkSubmissionStatus(account);
      setSubmissionStatus(status);
      setIsApproved(status?.approved === true);
      setIsClaimed(status?.claimed === true);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const checkRegistrationStatus = async () => {
    if (!connex || !account) return;

    try {
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

      const result = await studentsMethod.call(account);
      setIsRegistered(result.decoded.registered);
      console.log('Registration status:', result.decoded.registered);
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  const handleSubmissionSuccess = () => {
    setSubmissionStatus({ submitted: true, approved: false });
    setTimeout(checkStatus, 2000);
  };

  const handleRegistrationSuccess = () => {
    setTimeout(() => {
      checkRegistrationStatus();
      checkStatus();
    }, 2000);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Learn2Earn</h1>
        <p>Complete learning tasks and earn B3TR tokens</p>
      </header>

      <div className="wallet-section">
        <WalletConnection onAccountChange={setAccount} />
      </div>

      {account && (
        <>
          {!isRegistered && (
            <StudentRegistration 
              account={account} 
              onRegistrationSuccess={handleRegistrationSuccess}
            />
          )}

          {isRegistered && (
            <>
              <div className="card">
                <h2>Submit Your Proof of Learning</h2>
                <ProofSubmissionForm 
                  account={account}
                  onSubmissionSuccess={handleSubmissionSuccess}
                  disabled={submissionStatus?.submitted}
                />
                {submissionStatus?.submitted && !isApproved && (
                  <div className="status-message info">
                    Your submission is under review. Please check back later.
                  </div>
                )}
              </div>

              {isApproved && !isClaimed && (
                <div className="card">
                  <ClaimReward account={account} />
                </div>
              )}

              {isClaimed && (
                <div className="card">
                  <div className="reward-section">
                    <h3>✅ Reward Successfully Claimed!</h3>
                    <p>Your B3TR tokens have been distributed to your wallet.</p>
                    <div className="status-message success">
                      Claimed on: {new Date(submissionStatus.claimedAt).toLocaleDateString()}
                    </div>
                    {submissionStatus.transactionHash && (
                      <div style={{ marginTop: '1rem' }}>
                        <a
                          href={`https://explore-testnet.vechain.org/transactions/${submissionStatus.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                          }}
                        >
                          View Transaction on Explorer
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!account && (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666' }}>
            Please connect your VeWorld wallet to get started
          </p>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <DAppKitProvider
      nodeUrl={nodeUrl}
      genesis={genesis}
      walletConnectOptions={{
        projectId: 'YOUR_WALLET_CONNECT_PROJECT_ID',
        metadata: {
          name: 'Learn2Earn',
          description: 'VeChain Education Platform',
          url: window.location.origin,
          icons: [`${window.location.origin}/logo.png`],
        },
      }}
    >
      <AppContent />
    </DAppKitProvider>
  );
}

export default App;