import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useDezenMart, TradeParams, PurchaseParams } from '../hooks/useDezenMart';
import WalletConnection from './WalletConnection';

const DezenMartDashboard: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const {
    loading,
    error,
    initializeContract,
    registerSeller,
    registerBuyer,
    registerLogisticsProvider,
    createTrade,
    buyTrade,
    confirmDelivery,
  } = useDezenMart();

  const [activeTab, setActiveTab] = useState<'seller' | 'buyer' | 'logistics'>('seller');
  const [tradeForm, setTradeForm] = useState<TradeParams>({
    productName: '',
    productCost: 0,
    logisticsCosts: [0],
    logisticsProviders: [],
    totalQuantity: 0,
  });

  const handleRegister = async (type: 'seller' | 'buyer' | 'logistics') => {
    try {
      let signature;
      switch (type) {
        case 'seller':
          signature = await registerSeller();
          break;
        case 'buyer':
          signature = await registerBuyer();
          break;
        case 'logistics':
          signature = await registerLogisticsProvider();
          break;
      }
      if (signature) {
        alert(`Successfully registered as ${type}! Transaction: ${signature}`);
      }
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const signature = await createTrade(tradeForm);
      if (signature) {
        alert(`Trade created successfully! Transaction: ${signature}`);
        setTradeForm({
          productName: '',
          productCost: 0,
          logisticsCosts: [0],
          logisticsProviders: [],
          totalQuantity: 0,
        });
      }
    } catch (err) {
      console.error('Trade creation failed:', err);
    }
  };

  const addLogisticsProvider = () => {
    setTradeForm(prev => ({
      ...prev,
      logisticsCosts: [...prev.logisticsCosts, 0],
      logisticsProviders: [...prev.logisticsProviders, PublicKey.default],
    }));
  };

  const updateLogisticsProvider = (index: number, address: string, cost: number) => {
    try {
      const pubkey = new PublicKey(address);
      setTradeForm(prev => ({
        ...prev,
        logisticsProviders: prev.logisticsProviders.map((p, i) => i === index ? pubkey : p),
        logisticsCosts: prev.logisticsCosts.map((c, i) => i === index ? cost : c),
      }));
    } catch (err) {
      console.error('Invalid public key:', err);
    }
  };

  if (!connected) {
    return (
      <div className="dashboard-container">
        <h1>DezenMart - Decentralized Marketplace</h1>
        <p>Please connect your wallet to access the marketplace</p>
        <WalletConnection />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>DezenMart Dashboard</h1>
        <WalletConnection />
      </div>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'seller' ? 'active' : ''}`}
          onClick={() => setActiveTab('seller')}
        >
          Seller
        </button>
        <button
          className={`tab ${activeTab === 'buyer' ? 'active' : ''}`}
          onClick={() => setActiveTab('buyer')}
        >
          Buyer
        </button>
        <button
          className={`tab ${activeTab === 'logistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('logistics')}
        >
          Logistics Provider
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'seller' && (
          <div className="seller-panel">
            <h2>Seller Panel</h2>

            <div className="action-section">
              <h3>Registration</h3>
              <button
                onClick={() => handleRegister('seller')}
                disabled={loading}
                className="register-btn"
              >
                {loading ? 'Registering...' : 'Register as Seller'}
              </button>
            </div>

            <div className="action-section">
              <h3>Create Trade</h3>
              <form onSubmit={handleCreateTrade} className="trade-form">
                <div className="form-group">
                  <label>Product Name:</label>
                  <input
                    type="text"
                    value={tradeForm.productName}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, productName: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Product Cost (lamports):</label>
                  <input
                    type="number"
                    value={tradeForm.productCost}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, productCost: Number(e.target.value) }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Total Quantity:</label>
                  <input
                    type="number"
                    value={tradeForm.totalQuantity}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, totalQuantity: Number(e.target.value) }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Logistics Providers:</label>
                  {tradeForm.logisticsProviders.map((provider, index) => (
                    <div key={index} className="logistics-provider">
                      <input
                        type="text"
                        placeholder="Provider Public Key"
                        onChange={(e) => updateLogisticsProvider(index, e.target.value, tradeForm.logisticsCosts[index])}
                      />
                      <input
                        type="number"
                        placeholder="Cost (lamports)"
                        value={tradeForm.logisticsCosts[index]}
                        onChange={(e) => updateLogisticsProvider(index, provider.toString(), Number(e.target.value))}
                      />
                    </div>
                  ))}
                  <button type="button" onClick={addLogisticsProvider}>
                    Add Logistics Provider
                  </button>
                </div>

                <button type="submit" disabled={loading} className="create-trade-btn">
                  {loading ? 'Creating...' : 'Create Trade'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'buyer' && (
          <div className="buyer-panel">
            <h2>Buyer Panel</h2>

            <div className="action-section">
              <h3>Registration</h3>
              <button
                onClick={() => handleRegister('buyer')}
                disabled={loading}
                className="register-btn"
              >
                {loading ? 'Registering...' : 'Register as Buyer'}
              </button>
            </div>

            <div className="action-section">
              <h3>Available Trades</h3>
              <p>Trade browsing and purchasing functionality will be implemented here.</p>
            </div>
          </div>
        )}

        {activeTab === 'logistics' && (
          <div className="logistics-panel">
            <h2>Logistics Provider Panel</h2>

            <div className="action-section">
              <h3>Registration</h3>
              <button
                onClick={() => handleRegister('logistics')}
                disabled={loading}
                className="register-btn"
              >
                {loading ? 'Registering...' : 'Register as Logistics Provider'}
              </button>
            </div>

            <div className="action-section">
              <h3>Delivery Confirmations</h3>
              <p>Delivery confirmation functionality will be implemented here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DezenMartDashboard;