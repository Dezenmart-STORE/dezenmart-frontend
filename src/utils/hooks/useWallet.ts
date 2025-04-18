
// import { useState, useEffect } from 'react';
// import Web3 from 'web3';

// export function useWallet() {
//   const [isConnected, setIsConnected] = useState(false);
//   const [isConnecting, setIsConnecting] = useState(false);
//   const [walletAddress, setWalletAddress] = useState<string | null>(null);
//   const [balance, setBalance] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [web3, setWeb3] = useState<Web3 | null>(null);

//   // Celo contract addresses on Alfajores Testnet
//   const CELO_TOKEN_ADDRESS = '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9';
//   const CUSD_TOKEN_ADDRESS = '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1';

//   // ERC20 ABI for token interactions
//   const ERC20_ABI = [
//     {
//       constant: true,
//       inputs: [{ name: '_owner', type: 'address' }],
//       name: 'balanceOf',
//       outputs: [{ name: 'balance', type: 'uint256' }],
//       type: 'function',
//     }
//   ];

//   useEffect(() => {
//     const initWeb3 = () => {
//       if (window.ethereum) {
//         const web3Instance = new Web3(window.ethereum);
//         setWeb3(web3Instance);
//         return web3Instance;
//       }
//       return null;
//     };

//     const checkPreviousConnection = async () => {
//       const savedWalletState = localStorage.getItem('walletConnected');
      
//       if (savedWalletState === 'true') {
//         try {
//           if (window.ethereum) {
//             const web3Instance = initWeb3();
//             const accounts = await window.ethereum.request({ method: 'eth_accounts' });
//             if (accounts && accounts.length > 0 && web3Instance) {
//               setWalletAddress(accounts[0]);
//               setIsConnected(true);
//               fetchBalance(web3Instance, accounts[0]);
//             }
//           }
//         } catch (err) {
//           console.error("Error checking previous connection:", err);
//           disconnect();
//         }
//       } else {
//         initWeb3();
//       }
//     };
    
//     checkPreviousConnection();
    
//     if (window.ethereum) {
//       window.ethereum.on('accountsChanged', handleAccountsChanged);
//       window.ethereum.on('chainChanged', () => window.location.reload());
//       window.ethereum.on('disconnect', disconnect);
//     }
    
//     return () => {
//       if (window.ethereum) {
//         window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
//       }
//     };
//   }, []);

//   const handleAccountsChanged = (accounts: string[]) => {
//     if (accounts.length === 0) {
//       disconnect();
//     } else {
//       setWalletAddress(accounts[0]);
//       if (web3) {
//         fetchBalance(web3, accounts[0]);
//       }
//     }
//   };

//   // Fixed typing for the token contract
//   interface TokenContract {
//     methods: {
//       balanceOf(address: string): {
//         call(): Promise<string>;
//       };
//     };
//   }

//   const getTokenBalance = async (web3Instance: Web3, tokenAddress: string, accountAddress: string): Promise<string> => {
//     try {
//       // Use a properly typed contract interface
//       const tokenContract = new web3Instance.eth.Contract(
//         ERC20_ABI as any,
//         tokenAddress
//       ) as unknown as TokenContract;
      
//       // Now balance will be properly typed as a string
//       const balance = await tokenContract.methods.balanceOf(accountAddress).call();
      
//       // Convert from wei to ether
//       return web3Instance.utils.fromWei(balance, 'ether');
//     } catch (error) {
//       console.error(`Error fetching token balance for ${tokenAddress}:`, error);
//       return '0';
//     }
//   };

//   const fetchBalance = async (web3Instance: Web3, address: string) => {
//     try {
//       // Get native CELO balance
//       const celoBalance = await getTokenBalance(web3Instance, CELO_TOKEN_ADDRESS, address);
      
//       // Get cUSD balance
//       const cUSDBalance = await getTokenBalance(web3Instance, CUSD_TOKEN_ADDRESS, address);
      
//       // Format balances
//       const formattedCUSD = parseFloat(cUSDBalance).toFixed(2);
//       const formattedCELO = parseFloat(celoBalance).toFixed(2);
      
//       setBalance(`${formattedCUSD} cUSD | ${formattedCELO} CELO`);
//     } catch (err) {
//       console.error("Error fetching balance:", err);
//       setBalance("Error loading balance");
//     }
//   };

//   const connect = async () => {
//     setIsConnecting(true);
//     setError(null);
    
//     try {
//       if (!window.ethereum) {
//         throw new Error("No wallet extension detected. Please install a wallet like Valora, CeloExtensionWallet, or MetaMask.");
//       }
      
//       // Try to switch to Celo Alfajores network
//       try {
//         await window.ethereum.request({
//           method: 'wallet_switchEthereumChain',
//           params: [{ chainId: '0xaef3' }], // 44787 in hex
//         });
//       } catch (switchError: any) {
//         // If the chain doesn't exist, add it
//         if (switchError.code === 4902) {
//           await window.ethereum.request({
//             method: 'wallet_addEthereumChain',
//             params: [{
//               chainId: '0xaef3',
//               chainName: 'Celo Alfajores Testnet',
//               nativeCurrency: {
//                 name: 'CELO',
//                 symbol: 'CELO',
//                 decimals: 18
//               },
//               rpcUrls: ['https://alfajores-forno.celo-testnet.org'],
//               blockExplorerUrls: ['https://alfajores-blockscout.celo-testnet.org']
//             }],
//           });
//         } else {
//           throw switchError;
//         }
//       }
      
//       // Request account access
//       const accounts = await window.ethereum.request({
//         method: 'eth_requestAccounts'
//       });
      
//       const currentAccount = accounts[0];
//       setWalletAddress(currentAccount);
//       setIsConnected(true);
      
//       // Initialize Web3 if not already done
//       let web3Instance = web3;
//       if (!web3Instance) {
//         web3Instance = new Web3(window.ethereum);
//         setWeb3(web3Instance);
//       }
      
//       // Fetch balances
//       await fetchBalance(web3Instance, currentAccount);
      
//       // Save connection state
//       localStorage.setItem('walletConnected', 'true');
//     } catch (err: any) {
//       console.error("Failed to connect wallet:", err);
//       setError(err.message || "Failed to connect wallet");
//       disconnect();
//     } finally {
//       setIsConnecting(false);
//     }
//   };

//   const disconnect = () => {
//     setIsConnected(false);
//     setWalletAddress(null);
//     setBalance(null);
//     localStorage.removeItem('walletConnected');
//   };

//   return {
//     isConnected,
//     isConnecting,
//     walletAddress,
//     balance,
//     error,
//     connect,
//     disconnect
//   };
// }

// declare global {
//   interface Window {
//     ethereum?: any;
//   }
// }


import { useState, useEffect } from 'react';


export function useWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  // Check if wallet was previously connected
  useEffect(() => {
    const savedWalletState = localStorage.getItem('walletConnected');
    const savedAddress = localStorage.getItem('walletAddress');

    if (savedWalletState === 'true' && savedAddress) {
      setIsConnected(true);
      setWalletAddress(savedAddress);
      // fetch the current balance 
    }
  }, []);

  const connect = async () => {
    setIsConnecting(true);

    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // wallet connection logic


      // Example mock wallet address
      const mockAddress = '0x' + Math.random().toString(16).slice(2, 42);

      setWalletAddress(mockAddress);
      setBalance('100 cUSD');
      setIsConnected(true);

      // Save connection state
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletAddress', mockAddress);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setWalletAddress(null);
    setBalance(null);
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
  };

  return {
    isConnected,
    isConnecting,
    walletAddress,
    balance,
    connect,
    disconnect
  };
}