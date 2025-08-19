import React, { useState, useEffect } from 'react';
import { useWallet } from '@vechain/dapp-kit-react';

function WalletConnection({ onAccountChange }) {
  const { connect, disconnect, account, source } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (account) {
      onAccountChange(account);
    } else {
      onAccountChange(null);
    }
  }, [account, onAccountChange]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (account) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="connected-address">
          Connected: {formatAddress(account)}
        </div>
        <button className="btn btn-secondary" onClick={handleDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button 
      className="btn" 
      onClick={handleConnect}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <>
          <span className="loading"></span> Connecting...
        </>
      ) : (
        'Connect Wallet'
      )}
    </button>
  );
}

export default WalletConnection;