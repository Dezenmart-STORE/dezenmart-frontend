import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { erc20Abi, parseUnits, formatUnits } from 'viem';
import { useWallet } from './WalletContext';
import { getTokenAddress, getTokenBySymbol, ESCROW_ADDRESSES } from '../../utils/config/web3.config';
import { useSnackbar } from '../SnackbarContext';
import { parseWeb3Error } from '../../utils/errorParser';

interface ApprovalContextType {
  // Check allowance
  getTokenAllowance: (tokenSymbol: string) => Promise<number>;

  // Approve token spending
  approveToken: (tokenSymbol: string, amount: string) => Promise<string>;

  // Legacy USDT support
  usdtAllowance: bigint | undefined;
  usdtDecimals: number | undefined;
  approveUSDT: (amount: string) => Promise<string>;
}

const ApprovalContext = createContext<ApprovalContextType | undefined>(undefined);

export const ApprovalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, chain, isCorrectNetwork } = useWallet();
  const { showSnackbar } = useSnackbar();
  const { writeContractAsync } = useWriteContract();

  // Get escrow address for current chain
  const escrowAddress = useMemo(() => {
    if (!chain?.id) return undefined;
    return ESCROW_ADDRESSES[chain.id as keyof typeof ESCROW_ADDRESSES];
  }, [chain?.id]);

  // Legacy USDT contract address
  const usdtContractAddress = useMemo(() => {
    if (!chain?.id) return undefined;
    const usdtToken = getTokenBySymbol('USDT');
    return usdtToken ? (getTokenAddress(usdtToken, chain.id) as `0x${string}`) : undefined;
  }, [chain?.id]);

  // USDT allowance
  const { data: usdtAllowance } = useReadContract({
    address: usdtContractAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && escrowAddress ? [address, escrowAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!usdtContractAddress && !!escrowAddress && isCorrectNetwork,
      refetchInterval: 300000, // 5 minutes
      staleTime: 240000, // 4 minutes
    },
  });

  // USDT decimals
  const { data: usdtDecimals } = useReadContract({
    address: usdtContractAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: {
      enabled: !!usdtContractAddress && isCorrectNetwork,
      staleTime: Infinity,
    },
  });

  // Get token allowance
  const getTokenAllowance = useCallback(
    async (tokenSymbol: string): Promise<number> => {
      if (!address || !chain?.id || !escrowAddress) {
        return 0;
      }

      try {
        const token = getTokenBySymbol(tokenSymbol);
        if (!token) {
          throw new Error(`Token ${tokenSymbol} not found`);
        }

        const tokenAddress = getTokenAddress(token, chain.id);
        if (!tokenAddress) {
          throw new Error(`${tokenSymbol} not available on this chain`);
        }

        const { readContract } = await import('@wagmi/core');
        const { wagmiConfig } = await import('../../utils/config/web3.config');

        const [allowance, decimals] = await Promise.all([
          readContract(wagmiConfig, {
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [address, escrowAddress as `0x${string}`],
          }),
          readContract(wagmiConfig, {
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'decimals',
          }),
        ]);

        return parseFloat(formatUnits(allowance as bigint, decimals as number));
      } catch (error) {
        console.error(`[Approval] Error getting ${tokenSymbol} allowance:`, error);
        return 0;
      }
    },
    [address, chain?.id, escrowAddress]
  );

  // Approve token spending with exact amount + buffer
  const approveToken = useCallback(
    async (tokenSymbol: string, amount: string): Promise<string> => {
      if (!address || !chain?.id || !escrowAddress) {
        throw new Error('Wallet not connected or wrong network');
      }

      try {
        const token = getTokenBySymbol(tokenSymbol);
        if (!token) {
          throw new Error(`Token ${tokenSymbol} not found`);
        }

        const tokenAddress = getTokenAddress(token, chain.id);
        if (!tokenAddress) {
          throw new Error(`${tokenSymbol} not available on ${chain.name}`);
        }

        // Get token decimals
        const { readContract } = await import('@wagmi/core');
        const { wagmiConfig } = await import('../../utils/config/web3.config');

        const tokenDecimals = await readContract(wagmiConfig, {
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'decimals',
        });

        // Check current allowance
        const currentAllowance = await getTokenAllowance(tokenSymbol);
        const requiredAmount = parseFloat(amount);

        if (currentAllowance >= requiredAmount) {
          return '0x0'; // Already approved
        }

        // SECURITY FIX: Approve exact amount + 5% buffer instead of infinite approval
        const amountBigInt = parseUnits(amount, tokenDecimals as number);
        const bufferMultiplier = BigInt(105); // 105% (5% buffer)
        const approvalAmount = (amountBigInt * bufferMultiplier) / BigInt(100);

        console.log(`[Approval] Approving ${formatUnits(approvalAmount, tokenDecimals as number)} ${tokenSymbol}`);

        const hash = await writeContractAsync({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [escrowAddress as `0x${string}`, approvalAmount],
          gas: BigInt(150000),
        });

        showSnackbar(`${tokenSymbol} approval successful`, 'success');
        return hash;
      } catch (error: any) {
        console.error(`[Approval] ${tokenSymbol} approval failed:`, error);

        if (error?.message?.includes('User rejected')) {
          throw new Error('Approval was rejected by user');
        }
        if (error?.message?.includes('insufficient funds')) {
          throw new Error('Insufficient CELO for gas fees');
        }

        throw new Error(`Approval failed: ${parseWeb3Error(error)}`);
      }
    },
    [address, chain, escrowAddress, writeContractAsync, getTokenAllowance, showSnackbar]
  );

  // Legacy USDT approval
  const approveUSDT = useCallback(
    async (amount: string): Promise<string> => {
      return approveToken('USDT', amount);
    },
    [approveToken]
  );

  const value = useMemo(
    () => ({
      getTokenAllowance,
      approveToken,
      usdtAllowance,
      usdtDecimals: usdtDecimals as number | undefined,
      approveUSDT,
    }),
    [getTokenAllowance, approveToken, usdtAllowance, usdtDecimals, approveUSDT]
  );

  return <ApprovalContext.Provider value={value}>{children}</ApprovalContext.Provider>;
};

export const useApproval = () => {
  const context = useContext(ApprovalContext);
  if (!context) {
    throw new Error('useApproval must be used within ApprovalProvider');
  }
  return context;
};

ApprovalProvider.displayName = 'ApprovalProvider';
