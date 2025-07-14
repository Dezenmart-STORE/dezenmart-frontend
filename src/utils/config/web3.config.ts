import { http, createConfig, fallback } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";

const rpcEndpoints = {
  [celo.id]: ["https://forno.celo.org", "https://rpc.ankr.com/celo"],
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
    name: "Celo Dollar",
    symbol: "cUSD",
    decimals: 18,
    address: {
      [celo.id]: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      [celoAlfajores.id]: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    },
    icon: "💵",
  },
  {
    name: "Celo Euro",
    symbol: "cEUR",
    decimals: 18,
    address: {
      [celo.id]: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
      [celoAlfajores.id]: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F",
    },
    icon: "💶",
  },
  {
    name: "Celo Brazilian Real",
    symbol: "cREAL",
    decimals: 18,
    address: {
      [celo.id]: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
      [celoAlfajores.id]: "0xE4D517785D091D3c54818832dB6094bcc2744545",
    },
    icon: "💴",
  },
  {
    name: "Celo Kenyan Shilling",
    symbol: "cKES",
    decimals: 18,
    address: {
      [celo.id]: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "🏦",
  },
  {
    name: "Philippine Peso",
    symbol: "PUSO",
    decimals: 18,
    address: {
      [celo.id]: "0x46c9757C5497c5B1f2eb73aE79b6B67D119B0B58",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "💰",
  },
  {
    name: "Colombian Peso",
    symbol: "cCOP",
    decimals: 18,
    address: {
      [celo.id]: "0x62492A644A588FD904270BeD06ad52B9abfEA1aE",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "💸",
  },
  {
    name: "CFA Franc",
    symbol: "eXOF",
    decimals: 18,
    address: {
      [celo.id]: "0x73F93dcc49cB8A239e2032663e9475dd5ef29A08",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "🪙",
  },
  {
    name: "Nigerian Naira",
    symbol: "cNGN",
    decimals: 18,
    address: {
      [celo.id]: "0x17700282592D6917F6A73D0bF8AcCf4D578c131e",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "💵",
  },
  {
    name: "Japanese Yen",
    symbol: "cJPY",
    decimals: 18,
    address: {
      [celo.id]: "0x39049C02A56C3e0b3E4df5bb3e7b65AaC9A24D4F",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "💴",
  },
  {
    name: "Swiss Franc",
    symbol: "cCHF",
    decimals: 18,
    address: {
      [celo.id]: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "🏦",
  },
  {
    name: "South African Rand",
    symbol: "cZAR",
    decimals: 18,
    address: {
      [celo.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "💎",
  },
  {
    name: "British Pound",
    symbol: "cGBP",
    decimals: 18,
    address: {
      [celo.id]: "0x5d71876f56681de70c75366b64b80B7f043c7A87",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "💷",
  },
  {
    name: "Australian Dollar",
    symbol: "cAUD",
    decimals: 18,
    address: {
      [celo.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "💲",
  },
  {
    name: "Canadian Dollar",
    symbol: "cCAD",
    decimals: 18,
    address: {
      [celo.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "💵",
  },
  {
    name: "Ghanaian Cedi",
    symbol: "cGHS",
    decimals: 18,
    address: {
      [celo.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
      [celoAlfajores.id]: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    },
    icon: "🪙",
  },
];

// Legacy USDT addresses - for backward compatibility
export const USDT_ADDRESSES = {
  [celo.id]: import.meta.env.VITE_USDT_CONTRACT_ADDRESS_MAINNET!,
  [celoAlfajores.id]: import.meta.env.VITE_USDT_CONTRACT_ADDRESS_TESTNET!,
} as const;

export const ESCROW_ADDRESSES = {
  [celo.id]: import.meta.env.VITE_ESCROW_CONTRACT_MAINNET!,
  [celoAlfajores.id]: import.meta.env.VITE_ESCROW_CONTRACT_TESTNET!,
} as const;

// Default token is cUSD
export const DEFAULT_STABLE_TOKEN = STABLE_TOKENS[0];

export const TARGET_CHAIN = celoAlfajores;

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
      rpcEndpoints[celoAlfajores.id].map((url) =>
        http(undefined, {
          batch: true,
          retryCount: 3,
          retryDelay: 1000,
        })
      )
    ),
    [celoAlfajores.id]: fallback(
      rpcEndpoints[celoAlfajores.id].map((url) =>
        http(undefined, {
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
