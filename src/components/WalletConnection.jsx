import React, { useState, useEffect } from 'react';
import { useWallet } from '@vechain/dapp-kit-react';

function WalletConnection({ onAccountChange }) {
  const { connect, disconnect, account, source, setSource } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  
  // Check if VeWorld is available
  const isVeWorldAvailable = () => {
    return typeof window !== 'undefined' && window.vechain;
  };

  useEffect(() => {
    if (account) {
      onAccountChange(account);
      // Persist wallet connection
      localStorage.setItem('vechain_wallet_connected', 'true');
      localStorage.setItem('vechain_wallet_address', account);
    } else {
      onAccountChange(null);
      localStorage.removeItem('vechain_wallet_connected');
      localStorage.removeItem('vechain_wallet_address');
    }
  }, [account, onAccountChange]);

  // Auto-reconnect on page load
  useEffect(() => {
    const wasConnected = localStorage.getItem('vechain_wallet_connected');
    const savedAddress = localStorage.getItem('vechain_wallet_address');
    
    if (wasConnected && savedAddress && !account && isVeWorldAvailable()) {
      console.log('Auto-reconnecting to wallet...');
      setSource('veworld');
      connect().catch(err => {
        console.log('Auto-reconnect failed:', err);
        localStorage.removeItem('vechain_wallet_connected');
        localStorage.removeItem('vechain_wallet_address');
      });
    }
  }, [account, connect, setSource]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Check if VeWorld is available
      if (!isVeWorldAvailable()) {
        throw new Error('VeWorld wallet not found. Please install VeWorld extension and refresh the page.');
      }
      
      console.log('VeWorld detected, attempting to connect...');
      console.log('Available VeChain provider:', window.vechain);
      
      // Use the correct approach: setSource then connect
      console.log('Setting wallet source to veworld...');
      setSource('veworld');
      
      console.log('Calling connect...');
      const result = await connect();
      console.log('Connect result:', result);
      
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert(`Failed to connect: ${error.message}\n\nMake sure VeWorld is installed and unlocked.`);
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