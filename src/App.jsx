import React, { useState, useEffect } from 'react';
import { DAppKitProvider } from '@vechain/dapp-kit-react';
import WalletConnection from './components/WalletConnection';
import ProofSubmissionForm from './components/ProofSubmissionForm';
import ClaimReward from './components/ClaimReward';
import { checkSubmissionStatus } from './services/api';

const nodeUrl = 'https://mainnet.vechain.org/';
const genesis = 'main';

function App() {
  const [account, setAccount] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (account) {
      checkStatus();
    }
  }, [account]);

  const checkStatus = async () => {
    try {
      const status = await checkSubmissionStatus(account);
      setSubmissionStatus(status);
      setIsApproved(status?.approved === true);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleSubmissionSuccess = () => {
    setSubmissionStatus({ submitted: true, approved: false });
    setTimeout(checkStatus, 2000);
  };

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

            {isApproved && (
              <div className="card">
                <ClaimReward account={account} />
              </div>
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
    </DAppKitProvider>
  );
}

export default App;