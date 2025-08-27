import React, { useEffect, useState } from 'react';
import { useDAppKitWallet, useDAppKitWalletModal, useConnex } from '@vechain/vechain-kit';

function WalletConnection({ onAccountChange }) {
  const { account, disconnect, connect, setSource } = useDAppKitWallet();
  const { open: openModal } = useDAppKitWalletModal();
  const connex = useConnex();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (account) {
      onAccountChange(account);
      // Persist wallet connection
      localStorage.setItem('vechain_wallet_connected', 'true');
      localStorage.setItem('vechain_wallet_address', account);
      
      // Fetch balance
      fetchBalance(account);
    } else {
      onAccountChange(null);
      localStorage.removeItem('vechain_wallet_connected');
      localStorage.removeItem('vechain_wallet_address');
      setBalance(null);
    }
  }, [account, onAccountChange]);
  
  const fetchBalance = async (address) => {
    if (!connex) return;
    
    try {
      const acc = await connex.thor.account(address).get();
      const balanceInWei = acc.balance;
      const balanceInVET = (parseInt(balanceInWei, 16) / 1e18).toFixed(2);
      setBalance(balanceInVET);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  // Auto-reconnect is handled by VeChain Kit's persistence

  const handleConnect = () => {
    // Open the DApp Kit wallet modal
    openModal();
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
          {balance !== null && (
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
              Balance: {balance} VET
            </div>
          )}
          {connex && (
            <div style={{ fontSize: '0.8rem', color: '#28a745', marginTop: '0.25rem' }}>
              ✓ Connex Ready
            </div>
          )}
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
    >
      Connect Wallet
    </button>
  );
}

export default WalletConnection;