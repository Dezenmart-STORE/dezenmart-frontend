import { ChainId } from "@uniswap/sdk-core";

// Uniswap V3 contract addresses on Celo
export const UNISWAP_ADDRESSES = {
  [ChainId.CELO]: {
    SWAP_ROUTER_02: "0x5615CDAb10dc425a742d643d949a7F474C01abc4",
    QUOTER_V2: "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8",
    FACTORY: "0xAfE208a311B21f13EF87E33A90049fC17A7acDEc",
    NFT_POSITION_MANAGER: "0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A",
  },
  [ChainId.CELO_ALFAJORES]: {
    SWAP_ROUTER_02: "0x5615CDAb10dc425a742d643d949a7F474C01abc4",
    QUOTER_V2: "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8",
    FACTORY: "0xAfE208a311B21f13EF87E33A90049fC17A7acDEc",
    NFT_POSITION_MANAGER: "0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A",
  },
};

// Fee tiers for Uniswap V3
export enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

// Default fee tier to try for swaps
export const DEFAULT_FEE_TIER = FeeAmount.MEDIUM;

// Pool discovery configuration
export const POOL_DISCOVERY_CONFIG = {
  maxHops: 3, // Maximum number of pools to route through
  feeTiers: [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH],
};

// Slippage presets (in basis points)
export const SLIPPAGE_PRESETS = {
  LOW: 50, // 0.5%
  MEDIUM: 100, // 1%
  HIGH: 300, // 3%
  CUSTOM: 0,
};

// Transaction deadline (in seconds)
export const DEFAULT_DEADLINE = 1800; // 30 minutes

// Gas estimation multiplier for safety margin
export const GAS_ESTIMATE_MULTIPLIER = 1.2;

// RPC endpoints for Celo (fallback if primary fails)
export const CELO_RPC_URLS = {
  primary: "https://forno.celo.org",
  fallback: [
    "https://rpc.ankr.com/celo",
    "https://celo-mainnet.infura.io/v3/YOUR_INFURA_KEY",
  ],
};

// Subgraph endpoints for Uniswap on Celo
export const UNISWAP_SUBGRAPH_URLS = {
  [ChainId.CELO]:
    "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-celo",
  [ChainId.CELO_ALFAJORES]:
    "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-celo-alfajores",
};
