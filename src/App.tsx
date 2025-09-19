import React from 'react';
import { SolanaProvider } from './context/SolanaContext';
import DezenMartDashboard from './components/DezenMartDashboard';
import './App.css';

const App = () => {
  return (
    <SolanaProvider>
      <div className="App">
        <DezenMartDashboard />
      </div>
    </SolanaProvider>
  );
};

export default App;
