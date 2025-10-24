import React, { useState } from 'react';
import { CHAINENUMS } from '../account/overview/products/CreateProduct';
import { useGeneralStore } from '../../context/GeneralContext';

// 1. Define the Chain Enum (or equivalent constant object in JS)
// const Chain = {
//   SOLANA: "solana",
//   ETHEREUM: "ethereum",
// };

// Use this utility to get a capitalized, readable name for the UI
const getDisplayName = (chainValue:string) => {
    switch (chainValue) {
        case CHAINENUMS.solana: return "Solana";
        case CHAINENUMS.ethereum: return "Ethereum";
        default: return  "Unknown";
    }
};

// Use Lucide Icons for visual appeal (smaller for navbar)
const GlobeIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} mr-2 text-indigo-400`}>
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
    <path d="M2 12h20"></path>
  </svg>
);

const ChevronDownIcon = ({ className = "w-3 h-3" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} opacity-75 ml-1`}>
    <path d="m6 9 6 6 6-6"></path>
  </svg>
);

const SelectChain = () => {
  // State to hold the currently selected chain value
  const store =useGeneralStore()
  const [selectedChain, setSelectedChain] = useState(CHAINENUMS.solana);
  const [isOpen, setIsOpen] = useState(false);

  const chainOptions = Object.values(CHAINENUMS);

  const handleSelect = (chainValue:CHAINENUMS) => {
    setSelectedChain(chainValue);
    store.setSelectedChain(chainValue)
    setIsOpen(false);
  };

  return (
    // 1. COMPACT WRAPPER: Removed all full-screen/centering styles
    <div className="relative inline-block text-left z-20"> 
      
      {/* Dropdown Button (Current Selection) - Navbar friendly padding/size */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        // Adjusted padding (py-1.5, px-3) and font size (text-sm) for navbar use
        className="flex items-center  py-1.5  text-white text-sm font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150 shadow-sm  border-gray-300"
      >
        <GlobeIcon className="w-4 h-4"/>
        <span>{getDisplayName(selectedChain)}</span>
        <ChevronDownIcon />
      </button>

      {/* Dropdown Options Container */}
      {isOpen && (
        // Adjusted shadow and border for a floating menu look
        <div className="absolute right-0 w-40 mt-2 bg-gray-700 rounded-xl shadow-2xl border border-gray-200 origin-top-right">
          <div className="py-1">
            <p className="text-xs text-white px-4 pt-2 pb-1 font-semibold uppercase">Target Chain</p>
            {chainOptions.map((chainValue) => (
              <button
                key={chainValue}
                onClick={() => handleSelect(chainValue)}
                className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-gray-500  transition duration-100"
                role="menuitem"
              >
                {/* Visual indicator */}
                <span className={`w-3 h-3 rounded-full mr-3 border-2 ${selectedChain === chainValue ? 'bg-indigo-500 border-indigo-700' : 'bg-gray-100 border-gray-400'}`}></span>
                {getDisplayName(chainValue)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
    // NOTE: Removed the large "Display Current State" block
  );
};

export default SelectChain;