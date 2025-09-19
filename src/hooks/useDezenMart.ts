import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useState, useCallback } from 'react';
import { DezenMartClient } from '../solana/client-utils';
import { PROGRAM_CONFIG, CONTRACT_METHODS } from '../solana/program-config';
import { web3 } from '@solana/web3.js';

export interface TradeParams {
  productName: string;
  productCost: number;
  logisticsCosts: number[];
  logisticsProviders: PublicKey[];
  totalQuantity: number;
}

export interface PurchaseParams {
  tradeId: number;
  seller: PublicKey;
  quantity: number;
  selectedLogisticsProvider: PublicKey;
}

export const useDezenMart = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = new DezenMartClient();

  const handleError = (err: any) => {
    console.error('DezenMart operation error:', err);
    setError(err.message || 'An error occurred');
    return null;
  };

  const initializeContract = useCallback(async () => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      const [globalStatePDA] = await client.getGlobalStatePDA();

      const instruction = new web3.TransactionInstruction({
        keys: [
          { pubkey: globalStatePDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_CONFIG.PROGRAM_ID,
        data: Buffer.from([0]), // Initialize instruction discriminator
      });

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);

      return signature;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, sendTransaction, client]);

  const registerSeller = useCallback(async () => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      const [sellerPDA] = await client.getSellerPDA(publicKey);
      const [globalStatePDA] = await client.getGlobalStatePDA();

      const instruction = new web3.TransactionInstruction({
        keys: [
          { pubkey: sellerPDA, isSigner: false, isWritable: true },
          { pubkey: globalStatePDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_CONFIG.PROGRAM_ID,
        data: Buffer.from([2]), // RegisterSeller instruction discriminator
      });

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);

      return signature;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, sendTransaction, client]);

  const registerBuyer = useCallback(async () => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      const [buyerPDA] = await client.getBuyerPDA(publicKey);
      const [globalStatePDA] = await client.getGlobalStatePDA();

      const instruction = new web3.TransactionInstruction({
        keys: [
          { pubkey: buyerPDA, isSigner: false, isWritable: true },
          { pubkey: globalStatePDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_CONFIG.PROGRAM_ID,
        data: Buffer.from([3]), // RegisterBuyer instruction discriminator
      });

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);

      return signature;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, sendTransaction, client]);

  const registerLogisticsProvider = useCallback(async () => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      const [logisticsProviderPDA] = await client.getLogisticsProviderPDA(publicKey);
      const [globalStatePDA] = await client.getGlobalStatePDA();

      const instruction = new web3.TransactionInstruction({
        keys: [
          { pubkey: logisticsProviderPDA, isSigner: false, isWritable: true },
          { pubkey: globalStatePDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_CONFIG.PROGRAM_ID,
        data: Buffer.from([1]), // RegisterLogisticsProvider instruction discriminator
      });

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);

      return signature;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, sendTransaction, client]);

  const createTrade = useCallback(async (params: TradeParams) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      const validation = client.validateTradeParameters(params);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const [globalStatePDA] = await client.getGlobalStatePDA();
      const globalStateInfo = await client.getAccountInfo(globalStatePDA);

      if (!globalStateInfo) {
        throw new Error('Global state not initialized');
      }

      // Parse trade counter from global state (simplified)
      const tradeCounter = 1; // This should be parsed from actual account data

      const [tradePDA] = await client.getTradePDA(tradeCounter, publicKey);
      const [sellerPDA] = await client.getSellerPDA(publicKey);

      // Serialize trade parameters
      const data = Buffer.alloc(1000); // Allocate sufficient space
      let offset = 0;

      data.writeUInt8(4, offset); // CreateTrade instruction discriminator
      offset += 1;

      // Write product name (32 bytes)
      const productNameBuffer = Buffer.from(params.productName);
      productNameBuffer.copy(data, offset);
      offset += 32;

      // Write product cost (8 bytes)
      data.writeBigUInt64LE(BigInt(params.productCost), offset);
      offset += 8;

      // Write logistics costs
      data.writeUInt32LE(params.logisticsCosts.length, offset);
      offset += 4;
      params.logisticsCosts.forEach(cost => {
        data.writeBigUInt64LE(BigInt(cost), offset);
        offset += 8;
      });

      // Write logistics providers
      data.writeUInt32LE(params.logisticsProviders.length, offset);
      offset += 4;
      params.logisticsProviders.forEach(provider => {
        provider.toBuffer().copy(data, offset);
        offset += 32;
      });

      // Write total quantity
      data.writeBigUInt64LE(BigInt(params.totalQuantity), offset);
      offset += 8;

      const instruction = new web3.TransactionInstruction({
        keys: [
          { pubkey: tradePDA, isSigner: false, isWritable: true },
          { pubkey: sellerPDA, isSigner: false, isWritable: true },
          { pubkey: globalStatePDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_CONFIG.PROGRAM_ID,
        data: data.slice(0, offset),
      });

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);

      return signature;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, sendTransaction, client]);

  const buyTrade = useCallback(async (params: PurchaseParams) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      const [tradePDA] = await client.getTradePDA(params.tradeId, params.seller);
      const [buyerPDA] = await client.getBuyerPDA(publicKey);
      const [globalStatePDA] = await client.getGlobalStatePDA();

      // Get purchase counter from global state
      const purchaseCounter = 1; // This should be parsed from actual account data
      const [purchasePDA] = await client.getPurchasePDA(purchaseCounter, publicKey);

      // Serialize purchase parameters
      const data = Buffer.alloc(100);
      let offset = 0;

      data.writeUInt8(5, offset); // BuyTrade instruction discriminator
      offset += 1;

      data.writeBigUInt64LE(BigInt(params.tradeId), offset);
      offset += 8;

      data.writeBigUInt64LE(BigInt(params.quantity), offset);
      offset += 8;

      params.selectedLogisticsProvider.toBuffer().copy(data, offset);
      offset += 32;

      const instruction = new web3.TransactionInstruction({
        keys: [
          { pubkey: purchasePDA, isSigner: false, isWritable: true },
          { pubkey: tradePDA, isSigner: false, isWritable: true },
          { pubkey: buyerPDA, isSigner: false, isWritable: true },
          { pubkey: globalStatePDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: params.seller, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_CONFIG.PROGRAM_ID,
        data: data.slice(0, offset),
      });

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);

      return signature;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, sendTransaction, client]);

  const confirmDelivery = useCallback(async (purchaseId: number, buyer: PublicKey) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      const [purchasePDA] = await client.getPurchasePDA(purchaseId, buyer);
      const [logisticsProviderPDA] = await client.getLogisticsProviderPDA(publicKey);

      const data = Buffer.alloc(16);
      data.writeUInt8(6, 0); // ConfirmDeliveryAndPurchase instruction discriminator
      data.writeBigUInt64LE(BigInt(purchaseId), 1);

      const instruction = new web3.TransactionInstruction({
        keys: [
          { pubkey: purchasePDA, isSigner: false, isWritable: true },
          { pubkey: logisticsProviderPDA, isSigner: false, isWritable: false },
          { pubkey: publicKey, isSigner: true, isWritable: false },
        ],
        programId: PROGRAM_CONFIG.PROGRAM_ID,
        data,
      });

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);

      return signature;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, sendTransaction, client]);

  return {
    loading,
    error,
    initializeContract,
    registerSeller,
    registerBuyer,
    registerLogisticsProvider,
    createTrade,
    buyTrade,
    confirmDelivery,
    client,
  };
};