'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: '0',
    chainId: null,
    isConnecting: false,
    error: null
  });

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setState(prev => ({ 
        ...prev, 
        error: 'MetaMask is not installed. Please install MetaMask to continue.' 
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Get chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      // Get balance
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest']
      });

      // Convert balance from wei to ETH
      const balanceInEth = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);

      setState({
        isConnected: true,
        address: accounts[0],
        balance: balanceInEth,
        chainId: parseInt(chainId, 16),
        isConnecting: false,
        error: null
      });

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet'
      }));
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      balance: '0',
      chainId: null,
      isConnecting: false,
      error: null
    });

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
  }, []);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setState(prev => ({ ...prev, address: accounts[0] }));
    }
  }, [disconnectWallet]);

  const handleChainChanged = useCallback((chainId: string) => {
    setState(prev => ({ ...prev, chainId: parseInt(chainId, 16) }));
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, []);

  const getShortAddress = useCallback((address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!state.address || typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [state.address, 'latest']
      });

      const balanceInEth = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
      setState(prev => ({ ...prev, balance: balanceInEth }));
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  }, [state.address]);

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getShortAddress,
    refreshBalance
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (params: any) => void) => void;
      removeListener: (event: string, callback: (params: any) => void) => void;
    };
  }
}