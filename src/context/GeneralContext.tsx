import React, { useState, createContext, useContext, useMemo, Dispatch, SetStateAction } from 'react';
import { CHAINENUMS } from '../components/account/overview/products/CreateProduct';

// =======================================================
// 1. GLOBAL STORE SETUP (Context and Hook)
// =======================================================

// Define the Chain Enum


interface IGeneralStore{
    selectedChain:string,
    setSelectedChain:Dispatch<SetStateAction<CHAINENUMS>>,
    CHAINENUMS:typeof CHAINENUMS, // Export the enum object for convenience
    getDisplayName:(chain:CHAINENUMS)=>string,
}
// Renamed Context
const GeneralContext = createContext<IGeneralStore|null>(null);

/**
 * Custom hook to consume the global general state.
 * Use this hook in any component to get/set the global state.
 */
// Renamed Hook
export const useGeneralStore = () => {
  const context = useContext(GeneralContext);
  if (!context) {
    throw new Error('useGeneralStore must be used within a GeneralStore');
  }
  return context;
};
const getDisplayName = (chainValue:CHAINENUMS) => {
    switch (chainValue) {
        case CHAINENUMS.solana: return "Solana";
        case CHAINENUMS.ethereum: return "Ethereum";
        default: return "Unknown";
    }
};
/**
 * The Global Store Provider component that holds the application state.
 */
// Renamed Provider Component
export const GeneralStore = ({ children }:any) => {
  // State for the active chain
  const [selectedChain, setSelectedChain] = useState(CHAINENUMS.solana);
  
  // You can add other global states here, e.g.,
  // const [userProfile, setUserProfile] = useState(null);
  // const [isAppLoading, setIsAppLoading] = useState(false);

  // Use useMemo to ensure context value only changes when dependencies change
  const storeValue:IGeneralStore = useMemo(() => ({
    selectedChain,
    setSelectedChain,

    CHAINENUMS:CHAINENUMS, // Export the enum object for convenience
    getDisplayName,
    // userProfile, // Include other states here
  }), [selectedChain]); // Add other state dependencies here

  return (
    <GeneralContext.Provider value={storeValue}>
      {children}
    </GeneralContext.Provider>
  );
};



// export GeneralStore;