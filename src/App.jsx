import React, { useState, useEffect } from 'react';
import { VeChainKitProvider, TransactionModalProvider } from '@vechain/vechain-kit';
import WalletConnection from './components/WalletConnection';
import StudentRegistration from './components/StudentRegistration';
import ProofSubmissionForm from './components/ProofSubmissionForm';
import ClaimReward from './components/ClaimReward';
import { checkSubmissionStatus } from './services/api';
import { CONTRACT_ADDRESS } from './config/contract';

function AppContent() {
  const [account, setAccount] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (account) {
      checkStatus();
    }
  }, [account]);

  const checkStatus = async () => {
    try {
      // Check backend API status
      const status = await checkSubmissionStatus(account);
      setSubmissionStatus(status);
      
      // If we have backend data, use it to set all states
      if (status) {
        const approved = status.approved === true;
        const claimed = status.claimed === true;
        
        setIsApproved(approved);
        setIsClaimed(claimed);
        
        // If they have submitted, approved, or claimed - they must be registered
        if (status.submitted || status.approved || status.claimed) {
          setIsRegistered(true);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleSubmissionSuccess = () => {
    setSubmissionStatus({ submitted: true, approved: false });
    setTimeout(checkStatus, 2000);
  };

  const handleRegistrationSuccess = () => {
    setIsRegistered(true);
    setTimeout(() => {
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
              onRegistrationStatusChange={setIsRegistered}
            />
          )}

          {isRegistered && (
            <>
              {/* Show final claimed state */}
              {(isClaimed || submissionStatus?.claimed) ? (
                <div className="card">
                  <div className="reward-section">
                    <h3>✅ Reward Successfully Claimed!</h3>
                    <p>Your B3TR tokens have been distributed to your wallet.</p>
                    <div className="status-message success">
                      Claimed on: {new Date(submissionStatus?.claimedAt).toLocaleDateString()}
                    </div>
                    {submissionStatus?.transactionHash && (
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
              ) : (isApproved || submissionStatus?.approved) ? (
                /* Show claim reward section */
                <div className="card">
                  <ClaimReward account={account} />
                </div>
              ) : (
                /* Show submission form and status */
                <div className="card">
                  <h2>Submit Your Proof of Learning</h2>
                  <ProofSubmissionForm 
                    account={account}
                    onSubmissionSuccess={handleSubmissionSuccess}
                    disabled={submissionStatus?.submitted}
                  />
                  {submissionStatus?.submitted && !submissionStatus?.approved && (
                    <div className="status-message info">
                      Your submission is under review. Please check back later.
                    </div>
                  )}
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
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'fallback-project-id';
  
  console.log("🔧 Using projectId:", projectId);
  
  return (
    <VeChainKitProvider
      network={{
        type: 'test',
        nodeUrl: 'https://testnet.vechain.org/',
        genesisId: '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127'
      }}
      dappKit={{
        nodeUrl: 'https://testnet.vechain.org/',
        genesis: 'test',
        walletConnectOptions: {
          projectId: projectId,
          metadata: {
            name: 'Learn2Earn',
            description: 'VeChain Education Platform',
            url: window.location.origin,
            icons: [`${window.location.origin}/logo.png`],
          },
        },
        usePersistence: true,
        useFirstDetectedSource: false,
        allowedWallets: ['veworld', 'sync2', 'wallet-connect']
      }}
      loginMethods={['vechain', 'wallet']}
    >
      <TransactionModalProvider>
        <AppContent />
      </TransactionModalProvider>
    </VeChainKitProvider>
  );
}

export default App;