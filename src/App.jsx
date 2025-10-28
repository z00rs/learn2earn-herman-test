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
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(0);

  useEffect(() => {
    if (account) {
      console.log('🎯 App: useEffect triggered - account changed to:', account);
      checkStatus();
    } else {
      console.log('🎯 App: useEffect triggered - account is null');
    }
  }, [account]);

  const checkStatus = async () => {
    // Prevent frequent requests - check no more than once every 5 seconds
    const now = Date.now();
    if (now - lastCheckTime < 5000) {
      console.log('⏰ Skipping status check - too early (last check was', Math.round((now - lastCheckTime) / 1000), 'seconds ago)');
      return;
    }

    if (isLoading) {
      console.log('⏰ Skipping status check - request already in progress');
      return;
    }

    setIsLoading(true);
    setLastCheckTime(now);

    console.log('🔍 App: Starting status check for', account);

    try {
      // Check backend API status (includes contract state)
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/submissions/${account.toLowerCase()}/status`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Set submission status from backend data
        if (data.submission) {
          setSubmissionStatus({
            ...data.submission,
            submitted: true, // Always mark as submitted if exists in DB
            approved: data.submission.approved === 1
          });
          setIsApproved(data.submission.approved === 1);
        } else if (data.hasSubmission) {
          // Fallback if submission exists but not returned properly
          setSubmissionStatus({ submitted: true, approved: false });
        }
        
        // Set claimed status based on contract state
        setIsClaimed(data.isRewarded);
        
        // If they have been rewarded in contract, update submissionStatus too
        if (data.isRewarded) {
          setSubmissionStatus(prev => ({
            ...prev,
            claimed: true,
            claimedAt: data.lastRewardAt || new Date().toISOString()
          }));
        }
        
        // Set registration status based on contract state
        const wasRegistered = isRegistered;
        setIsRegistered(data.isRegistered);
        
        // Only log on significant changes to reduce spam
        if (data.isRegistered !== wasRegistered || data.isRewarded !== isClaimed) {
          console.log('✅ Status updated from backend:', {
            isRegistered: data.isRegistered,
            wasRegistered: wasRegistered,
            isRewarded: data.isRewarded,
            wasClaimed: isClaimed,
            hasSubmission: data.hasSubmission,
            submissionApproved: data.submission?.approved
          });
        }
      } else {
        console.log('⚠️ Fallback to old API');
        // Fallback to old API method if new endpoint doesn't exist yet
        const status = await checkSubmissionStatus(account);
        setSubmissionStatus(status);
        
        if (status) {
          const approved = status.approved === true;
          setIsApproved(approved);
          
          // If they have submitted, approved, or claimed - they must be registered
          if (status.submitted || status.approved || status.claimed) {
            setIsRegistered(true);
          }
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      
      // Fallback to old method on error
      try {
        const status = await checkSubmissionStatus(account);
        setSubmissionStatus(status);
        
        if (status) {
          const approved = status.approved === true;
          setIsApproved(approved);
          
          if (status.submitted || status.approved || status.claimed) {
            setIsRegistered(true);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback status check also failed:', fallbackError);
      }
    } finally {
      console.log('🏁 App: Status check completed for', account);
      setIsLoading(false);
    }
  };

  const handleSubmissionSuccess = () => {
    setSubmissionStatus({ submitted: true, approved: false });
    // Delay before status update
    setTimeout(() => {
      setLastCheckTime(0); // Reset time for forced check
      checkStatus();
    }, 2000);
  };

  const handleRegistrationSuccess = async () => {
    console.log('🎯 App: handleRegistrationSuccess called');
    
    // Prevent multiple rapid calls
    if (isLoading) {
      console.log('⚠️ App: handleRegistrationSuccess skipped - already loading');
      return;
    }
    
    // Clear backend cache only once
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      await fetch(`${API_BASE_URL}/clear-cache/${account.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('✅ App: Backend cache cleared after registration');
    } catch (error) {
      console.log('⚠️ App: Could not clear backend cache');
    }
    
    // Don't immediately set isRegistered = true, let checkStatus determine the real status
    // Wait a bit longer to allow for blockchain confirmation
    setTimeout(() => {
      console.log('🔄 App: Triggering status check after registration');
      setLastCheckTime(0); // Reset time for forced check
      checkStatus(); // This will properly set isRegistered based on contract state
    }, 3000); // Increased delay to reduce rapid requests
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
          {isLoading && (
            <div className="card">
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div className="loading" style={{ margin: '0 auto 0.5rem' }}></div>
                <p>Checking registration status...</p>
              </div>
            </div>
          )}
          
          {!isLoading && !isRegistered && (
            <StudentRegistration 
              account={account} 
              onRegistrationSuccess={handleRegistrationSuccess}
              onRegistrationStatusChange={setIsRegistered}
            />
          )}

          {!isLoading && isRegistered && (
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
                      📋 Your submission is under review by the administrator. Please wait for approval.
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