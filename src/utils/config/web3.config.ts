import { http, createConfig, fallback } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";
import cUSDIcon from "../../assets/icons/cUSD.svg";
import cEURIcon from "../../assets/icons/cEUR.svg";
import cREALIcon from "../../assets/icons/cREAL.svg";
import cKESIcon from "../../assets/icons/cKES.svg";
import PUSOIcon from "../../assets/icons/PUSO.svg";
import cCOPIcon from "../../assets/icons/cCOP.svg";
import eXOFIcon from "../../assets/icons/eXOF.svg";
import cNGNIcon from "../../assets/icons/cNGN.svg";
import cJPYIcon from "../../assets/icons/cJPY.svg";
import cCHFIcon from "../../assets/icons/cCHF.svg";
import cZARIcon from "../../assets/icons/cZAR.svg";
import cGBPIcon from "../../assets/icons/cGBP.svg";
import cAUDIcon from "../../assets/icons/cAUD.svg";
import cCADIcon from "../../assets/icons/cCAD.svg";
import cGHSIcon from "../../assets/icons/cGHS.svg";
import USDTIcon from "../../assets/icons/USDT.svg";
import GDIcon from "../../assets/icons/G$.svg";

const rpcEndpoints = {
  [celo.id]: [
    "https://rpc.ankr.com/celo",
    "https://forno.celo.org",
    "https://celo-mainnet.public.blastapi.io",
  ],
  [celoAlfajores.id]: ["https://alfajores-forno.celo-testnet.org"],
};

export interface StableToken {
  name: string;
  symbol: string;
  decimals: number;
  address: Record<number, string>;
  icon?: string;
}

export const STABLE_TOKENS: StableToken[] = [
  {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    address: {
      [celo.id]: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
      [celoAlfajores.id]: "0x803700bD991d293306D6e7dCcF2B49F9137b437e",
    },
    icon: USDTIcon,
  },
  {
    name: "GoodDollar",
    symbol: "G$",
    decimals: 18,
    address: {
      [celo.id]: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
      [celoAlfajores.id]: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
    },
    icon: GDIcon,
  },
  {
    name: "Celo Dollar",
    symbol: "cUSD",
    decimals: 18,
    address: {
      [celo.id]: "0x765de816845861e75a25fca122bb6898b8b1282a",
      [celoAlfajores.id]: "0x874069fa1eb16d44d622f2e0ca25eea172369bc1",
    },
    icon: cUSDIcon,
  },
  {
    name: "Celo Euro",
    symbol: "cEUR",
    decimals: 18,
    address: {
      [celo.id]: "0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73",
      [celoAlfajores.id]: "0x10c892a6ec43a53e45d0b916b4b7d383b1b78c0f",
    },
    icon: cEURIcon,
  },
  {
    name: "Celo Brazilian Real",
    symbol: "cREAL",
    decimals: 18,
    address: {
      [celo.id]: "0xe8537a3d056da446677b9e9d6c5db704eaab4787",
      [celoAlfajores.id]: "0xe4d517785d091d3c54818832db6094bcc2744545",
    },
    icon: cREALIcon,
  },
  {
    name: "Celo Kenyan Shilling",
    symbol: "cKES",
    decimals: 18,
    address: {
      [celo.id]: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
      [celoAlfajores.id]: "0x1E0433C1769271ECcF4CFF9FDdD515eefE6CdF92",
    },
    icon: cKESIcon,
  },
  {
    name: "Philippine Peso",
    symbol: "PUSO",
    decimals: 18,
    address: {
      [celo.id]: "0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B",
      [celoAlfajores.id]: "0x5E0E3c9419C42a1B04e2525991FB1A2C467AB8bF",
    },
    icon: PUSOIcon,
  },
  {
    name: "Colombian Peso",
    symbol: "cCOP",
    decimals: 18,
    address: {
      [celo.id]: "0x8a567e2ae79ca692bd748ab832081c45de4041ea",
      [celoAlfajores.id]: "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
    },
    icon: cCOPIcon,
  },
  {
    name: "CFA Franc",
    symbol: "eXOF",
    decimals: 18,
    address: {
      [celo.id]: "0x73F93dcc49cB8A239e2032663e9475dd5ef29A08",
      [celoAlfajores.id]: "0xB0FA15e002516d0301884059c0aaC0F0C72b019D",
    },
    icon: eXOFIcon,
  },
  {
    name: "Nigerian Naira",
    symbol: "cNGN",
    decimals: 18,
    address: {
      [celo.id]: "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71",
      [celoAlfajores.id]: "0x4a5b03B8b16122D330306c65e4CA4BC5Dd6511d0",
    },
    icon: cNGNIcon,
  },
  {
    name: "Japanese Yen",
    symbol: "cJPY",
    decimals: 18,
    address: {
      [celo.id]: "0xc45eCF20f3CD864B32D9794d6f76814aE8892e20",
      [celoAlfajores.id]: "0x2E51F41238cA36a421C9B8b3e189e8Cc7653FE67",
    },
    icon: cJPYIcon,
  },
  {
    name: "Swiss Franc",
    symbol: "cCHF",
    decimals: 18,
    address: {
      [celo.id]: "0xb55a79F398E759E43C95b979163f30eC87Ee131D",
      [celoAlfajores.id]: "0xADC57C2C34aD021Df4421230a6532F4e2E1dCE4F",
    },
    icon: cCHFIcon,
  },
  {
    name: "South African Rand",
    symbol: "cZAR",
    decimals: 18,
    address: {
      [celo.id]: "0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6",
      [celoAlfajores.id]: "0x1e5b44015Ff90610b54000DAad31C89b3284df4d",
    },
    icon: cZARIcon,
  },
  {
    name: "British Pound",
    symbol: "cGBP",
    decimals: 18,
    address: {
      [celo.id]: "0xCCF663b1fF11028f0b19058d0f7B674004a40746",
      [celoAlfajores.id]: "0x47f2Fb88105155a18c390641C8a73f1402B2BB12",
    },
    icon: cGBPIcon,
  },
  {
    name: "Australian Dollar",
    symbol: "cAUD",
    decimals: 18,
    address: {
      [celo.id]: "0x7175504C455076F15c04A2F90a8e352281F492F9",
      [celoAlfajores.id]: "0x84CBD49F5aE07632B6B88094E81Cce8236125Fe0",
    },
    icon: cAUDIcon,
  },
  {
    name: "Canadian Dollar",
    symbol: "cCAD",
    decimals: 18,
    address: {
      [celo.id]: "0xff4Ab19391af240c311c54200a492233052B6325",
      [celoAlfajores.id]: "0x02EC9E0D2Fd73e89168C1709e542a48f58d7B133",
    },
    icon: cCADIcon,
  },
  {
    name: "Ghanaian Cedi",
    symbol: "cGHS",
    decimals: 18,
    address: {
      [celo.id]: "0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313",
      [celoAlfajores.id]: "0x295B66bE7714458Af45E6A6Ea142A5358A6cA375",
    },
    icon: cGHSIcon,
  },
];

// Legacy USDT addresses - for backward compatibility
// export const USDT_ADDRESSES = {
//   [celo.id]: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
//   [celoAlfajores.id]: "0x803700bD991d293306D6e7dCcF2B49F9137b437e",
// } as const;

export const ESCROW_ADDRESSES = {
  [celo.id]: import.meta.env.VITE_ESCROW_CONTRACT_MAINNET!,
  [celoAlfajores.id]: import.meta.env.VITE_ESCROW_CONTRACT_TESTNET!,
} as const;

// Default token is cUSD (index 2 in the array)
export const DEFAULT_STABLE_TOKEN = STABLE_TOKENS[2];

export const TARGET_CHAIN = celo;

export const wagmiConfig = createConfig({
  chains: [celo, celoAlfajores],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "Dezenmart",
        url: window.location.origin,
      },
    }),
    coinbaseWallet({
      appName: "Dezenmart",
      appLogoUrl: `${window.location.origin}/images/logo-full.png`,
    }),
    ...(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
      ? [
          walletConnect({
            projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
            metadata: {
              name: "Dezenmart",
              description:
                "Decentralized marketplace for secure crypto payments",
              url: window.location.origin,
              icons: [`${window.location.origin}/images/logo-full.png`],
            },
            showQrModal: true,
          }),
        ]
      : []),
  ],
  transports: {
    [celo.id]: fallback(
      rpcEndpoints[celo.id].map((url) =>
        http(url, {
          batch: true,
          retryCount: 3,
          retryDelay: 1000,
        })
      )
    ),
    [celoAlfajores.id]: fallback(
      rpcEndpoints[celoAlfajores.id].map((url) =>
        http(url, {
          batch: true,
          retryCount: 3,
          retryDelay: 1000,
        })
      )
    ),
  },
});

// Helper function to get token by symbol
export const getTokenBySymbol = (symbol: string): StableToken | undefined => {
  return STABLE_TOKENS.find((token) => token.symbol === symbol);
};

// Helper function to get token address for current chain
export const getTokenAddress = (
  token: StableToken,
  chainId: number
): string | undefined => {
  return token.address[chainId];
};

// Helper function to get real USDT address for current chain
export const getRealUSDTAddress = (chainId: number): string | undefined => {
  // return USDT_ADDRESSES[chainId as keyof typeof USDT_ADDRESSES];
  return STABLE_TOKENS[0].address[chainId];
};

// Helper function to get token address by symbol for current chain
export const getTokenAddressBySymbol = (
  symbol: string,
  chainId: number
): string | undefined => {
  const token = STABLE_TOKENS.find((t) => t.symbol === symbol);
  if (token) {
    return token.address[chainId];
  }

  // Fallback for legacy tokens
  if (symbol === "USDT") {
    // return USDT_ADDRESSES[chainId as keyof typeof USDT_ADDRESSES];
    return STABLE_TOKENS[0].address[chainId];
  }

  return undefined;
};

// Helper function to create trade parameters with proper token address
export const createTradeParams = (
  productCost: number,
  logisticsProviders: string[],
  logisticsCosts: number[],
  totalQuantity: string,
  paymentToken: string,
  chainId: number
) => {
  const tokenAddress = getTokenAddressBySymbol(paymentToken, chainId);

  return {
    productCost,
    logisticsProvider: logisticsProviders,
    logisticsCost: logisticsCosts,
    useUSDT: paymentToken === "USDT",
    totalQuantity,
    paymentToken,
    tokenAddress, // This will be used by the smart contract
  };
};
