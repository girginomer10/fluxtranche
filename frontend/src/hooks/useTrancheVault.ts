import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS } from '@/config/web3';
import { TrancheVaultABI, ERC20ABI } from '@/config/contracts';
import { useState, useEffect } from 'react';

export enum Tranche {
  SENIOR = 0,
  JUNIOR = 1,
}

export function useTrancheVault() {
  const { address } = useAccount();
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: {
      enabled: !!address,
    },
  });

  // Read current epoch data
  const { data: epochData } = useReadContract({
    address: CONTRACTS.TRANCHE_VAULT as `0x${string}`,
    abi: TrancheVaultABI,
    functionName: 'currentEpoch',
  });

  // Read senior APY
  const { data: seniorAPY } = useReadContract({
    address: CONTRACTS.TRANCHE_VAULT as `0x${string}`,
    abi: TrancheVaultABI,
    functionName: 'getSeniorAPY',
  });

  // Read NAVs
  const { data: seniorNAV } = useReadContract({
    address: CONTRACTS.TRANCHE_VAULT as `0x${string}`,
    abi: TrancheVaultABI,
    functionName: 'getTrancheNAV',
    args: [BigInt(Tranche.SENIOR)],
  });

  const { data: juniorNAV } = useReadContract({
    address: CONTRACTS.TRANCHE_VAULT as `0x${string}`,
    abi: TrancheVaultABI,
    functionName: 'getTrancheNAV',
    args: [BigInt(Tranche.JUNIOR)],
  });

  // Read total assets
  const { data: totalAssets } = useReadContract({
    address: CONTRACTS.TRANCHE_VAULT as `0x${string}`,
    abi: TrancheVaultABI,
    functionName: 'totalAssets',
  });

  // Write contract functions
  const { 
    data: approveHash,
    writeContract: approveWrite 
  } = useWriteContract();

  const { isLoading: isApprovePending } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { 
    data: depositHash,
    writeContract: depositWrite 
  } = useWriteContract();

  const { isLoading: isDepositPending } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  const { 
    data: withdrawHash,
    writeContract: withdrawWrite 
  } = useWriteContract();

  const { isLoading: isWithdrawPending } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  // Helper functions
  const deposit = async (
    amount: string,
    tranche: Tranche,
    receiver: `0x${string}`
  ) => {
    try {
      setIsApproving(true);
      
      // First approve
      const amountBigInt = parseUnits(amount, 6); // USDC has 6 decimals
      await approveWrite({
        address: CONTRACTS.USDC as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [CONTRACTS.TRANCHE_VAULT as `0x${string}`, amountBigInt],
      });

      setIsApproving(false);
      setIsDepositing(true);

      // Then deposit
      const result = await depositWrite({
        address: CONTRACTS.TRANCHE_VAULT as `0x${string}`,
        abi: TrancheVaultABI,
        functionName: 'depositTranche',
        args: [amountBigInt, receiver, BigInt(tranche)],
      });

      setIsDepositing(false);
      return result;
    } catch (error) {
      setIsApproving(false);
      setIsDepositing(false);
      throw error;
    }
  };

  const withdraw = async (
    shares: string,
    tranche: Tranche,
    receiver: `0x${string}`
  ) => {
    try {
      setIsWithdrawing(true);
      
      const sharesBigInt = parseUnits(shares, 6);
      const result = await withdrawWrite({
        address: CONTRACTS.TRANCHE_VAULT as `0x${string}`,
        abi: TrancheVaultABI,
        functionName: 'withdrawTranche',
        args: [sharesBigInt, receiver, BigInt(tranche)],
      });

      setIsWithdrawing(false);
      return result;
    } catch (error) {
      setIsWithdrawing(false);
      throw error;
    }
  };

  // Format epoch data
  const formatEpochData = () => {
    if (!epochData) return null;
    
    const [index, startTime, endTime, seniorAssets, juniorAssets, totalReturn, settled] = epochData;
    
    return {
      index: Number(index),
      startTime: Number(startTime),
      endTime: Number(endTime),
      seniorAssets: formatUnits(seniorAssets, 6),
      juniorAssets: formatUnits(juniorAssets, 6),
      totalReturn: formatUnits(totalReturn, 6),
      settled,
      timeRemaining: Math.max(0, Number(endTime) - Date.now() / 1000),
    };
  };

  return {
    // Data
    epochData: formatEpochData(),
    seniorAPY: seniorAPY ? Number(seniorAPY) : 0,
    seniorNAV: seniorNAV ? Number(formatUnits(seniorNAV, 6)) : 1,
    juniorNAV: juniorNAV ? Number(formatUnits(juniorNAV, 6)) : 1,
    totalAssets: totalAssets ? formatUnits(totalAssets, 6) : '0',
    usdcBalance: usdcBalance ? formatUnits(usdcBalance, 6) : '0',
    
    // Actions
    deposit,
    withdraw,
    
    // Loading states
    isApproving: isApproving || isApprovePending,
    isDepositing: isDepositing || isDepositPending,
    isWithdrawing: isWithdrawing || isWithdrawPending,
  };
}