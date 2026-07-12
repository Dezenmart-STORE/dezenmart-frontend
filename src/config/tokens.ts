import { celo, celoAlfajores } from "wagmi/chains";

// Icon imports
import cUSDIcon from "../assets/icons/cUSD.svg";
import cEURIcon from "../assets/icons/cEUR.svg";
import cREALIcon from "../assets/icons/cREAL.svg";
import cKESIcon from "../assets/icons/cKES.svg";
import PUSOIcon from "../assets/icons/PUSO.svg";
import cCOPIcon from "../assets/icons/cCOP.svg";
import eXOFIcon from "../assets/icons/eXOF.svg";
import cNGNIcon from "../assets/icons/cNGN.svg";
import cJPYIcon from "../assets/icons/cJPY.svg";
import cCHFIcon from "../assets/icons/cCHF.svg";
import cZARIcon from "../assets/icons/cZAR.svg";
import cGBPIcon from "../assets/icons/cGBP.svg";
import cAUDIcon from "../assets/icons/cAUD.svg";
import cCADIcon from "../assets/icons/cCAD.svg";
import cGHSIcon from "../assets/icons/cGHS.svg";
import USDTIcon from "../assets/icons/USDT.svg";
import GDIcon from "../assets/icons/G$.svg";

// ---------------------------------------------------------------------------
// Token type
// ---------------------------------------------------------------------------
export interface StableToken {
  name: string;
  symbol: string;
  decimals: number;
  /** address[chainId] -> contract address */
  address: Record<number, `0x${string}`>;
  icon: string;
  /** True if the token is a fiat-pegged stablecoin */
  isStableToken: boolean;
}

// ---------------------------------------------------------------------------
// All supported stablecoins
// ---------------------------------------------------------------------------
export const TOKENS: StableToken[] = [
  {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    address: {
      [celo.id]: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
      [celoAlfajores.id]: "0x803700bD991d293306D6e7dCcF2B49F9137b437e",
    },
    icon: USDTIcon,
    isStableToken: true,
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
    isStableToken: false,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
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
    isStableToken: true,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------
let _bySymbol: Map<string, StableToken> | null = null;

function ensureSymbolMap(): Map<string, StableToken> {
  if (!_bySymbol) {
    _bySymbol = new Map(TOKENS.map((t) => [t.symbol, t]));
  }
  return _bySymbol;
}

export function getToken(symbol: string): StableToken | undefined {
  return ensureSymbolMap().get(symbol);
}

export function getTokenAddress(
  symbol: string,
  chainId: number
): `0x${string}` | undefined {
  return ensureSymbolMap().get(symbol)?.address[chainId];
}

export function getTokenDecimals(symbol: string): number {
  return ensureSymbolMap().get(symbol)?.decimals ?? 18;
}

/**
 * Tokens accepted by the Celo FeeCurrencyDirectory contract (CIP-64).
 * When set as `feeCurrency` in a transaction, gas is deducted from that token
 * instead of CELO. Each entry has passed a Celo governance proposal.
 *
 * Sources: CIP-54 (cKES), CGP-0118 (cCOP), CIP-47 (eXOF), CGP-134 (PUSO),
 *          CGP-0167 (USDT adapter, executed 2025-03-21).
 *
 * NOTE on G$ (GoodDollar, 18 decimals): registration evidence is strong but
 * unconfirmed on-chain. Verify with `celocli network:whitelist` - if confirmed,
 * add "G$" here; no adapter entry needed (18-decimal tokens use their own address).
 */
const FEE_CURRENCY_SYMBOLS = new Set([
  // Verified on-chain 2026-05-16 via FeeCurrencyDirectory.getCurrencies() on Celo mainnet
  "cUSD", "cEUR", "cREAL",  // original Mento stablecoins
  "cKES",                    // Mento Kenyan Shilling
  "eXOF",                    // Mento West African CFA
  "cCOP",                    // Mento Colombian Peso
  "PUSO",                    // Mento Philippine Peso
  "cGHS",                    // Mento Ghanaian Cedi
  "cNGN",                    // Mento Nigerian Naira
  "cGBP",                    // Mento British Pound
  "cZAR",                    // Mento South African Rand
  "cCAD",                    // Mento Canadian Dollar
  "cAUD",                    // Mento Australian Dollar
  "cCHF",                    // Mento Swiss Franc
  "cJPY",                    // Mento Japanese Yen
  "USDT",                    // Tether USD (CGP-0167, via FeeCurrencyAdapter)
  // G$ (GoodDollar) is NOT in the FeeCurrencyDirectory - confirmed via on-chain query
  // WETH is whitelisted on-chain but is not a payment token in this app
  // USDC adapter (0x2F25...) is whitelisted but USDC is not a supported payment token
]);

/**
 * Tokens with non-18 decimals cannot be registered directly in the
 * FeeCurrencyDirectory - a FeeCurrencyAdapter normalises decimals for the Celo
 * gas engine. The `feeCurrency` field must point to the adapter address, NOT
 * the token address, for these tokens to function as fee currencies.
 *
 * Only mainnet entries are listed; Alfajores adapters are not yet deployed for
 * these tokens (on testnet, fee currency resolves to undefined → CELO fallback).
 */
const FEE_CURRENCY_ADAPTERS: Partial<Record<string, Partial<Record<number, `0x${string}`>>>> = {
  USDT: {
    [celo.id]: "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72", // CGP-0167
  },
};

/**
 * Returns the on-chain address to pass as `feeCurrency` in a Celo transaction,
 * or `undefined` if the token is not whitelisted or has no adapter on this chain.
 *
 * For adapter tokens (e.g. USDT): returns the adapter address.
 * For 18-decimal Mento stablecoins: returns the token's own address.
 * For adapter tokens with no entry on this chainId: returns undefined
 * (fee currency unavailable on this network - caller falls back to CELO).
 */
export function getFeeCurrencyAddress(
  tokenSymbol: string,
  chainId: number
): `0x${string}` | undefined {
  if (!FEE_CURRENCY_SYMBOLS.has(tokenSymbol)) return undefined;
  // Tokens with adapters must have an entry for this chainId or the fee
  // currency is not available on this network.
  if (FEE_CURRENCY_ADAPTERS[tokenSymbol]) {
    return FEE_CURRENCY_ADAPTERS[tokenSymbol]?.[chainId];
  }
  // 18-decimal Mento stablecoins: token address = fee currency address
  return getTokenAddress(tokenSymbol, chainId);
}

/**
 * Priority order for fee currency fallback.
 * cUSD first because it's the most liquid and universally held on MiniPay.
 */
const FEE_CURRENCY_PRIORITY = [
  "cUSD", "cEUR", "cREAL", "cKES", "eXOF", "cCOP", "PUSO",
  "cGHS", "cNGN", "cGBP", "cZAR", "cCAD", "cAUD", "cCHF", "cJPY",
  "USDT",
];

/**
 * For wallets that support CIP-64 but are paying with a non-fee-currency token
 * (e.g. USDT on MiniPay), returns the address + symbol of the best available
 * fee currency based on the user's actual balances.
 *
 * Returns undefined if the payment token is already a fee currency, or if no
 * usable fee currency balance was found.
 */
export function getFallbackFeeCurrency(
  paymentToken: string,
  chainId: number,
  /** Map of symbol → numeric balance. Only needs fee-currency tokens. */
  balances: Partial<Record<string, number>>
): { address: `0x${string}`; symbol: string } | undefined {
  // Payment token itself is a fee currency - no fallback needed
  if (FEE_CURRENCY_SYMBOLS.has(paymentToken)) return undefined;

  for (const symbol of FEE_CURRENCY_PRIORITY) {
    if ((balances[symbol] ?? 0) > 0.0005) {
      const address = getTokenAddress(symbol, chainId);
      if (address) return { address, symbol };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
export const DEFAULT_TOKEN = TOKENS[0]; // USDT

// ---------------------------------------------------------------------------
// Trade parameter builder
// ---------------------------------------------------------------------------
export function buildTradeParams(
  productCost: number,
  totalQuantity: number,
  paymentToken: string,
  chainId: number
) {
  const normalizedQty = Number.isFinite(totalQuantity)
    ? Math.floor(totalQuantity)
    : 0;
  const tokenAddress = getTokenAddress(paymentToken, chainId);

  return {
    productCost,
    totalQuantity: normalizedQty,
    paymentToken,
    tokenAddress,
  };
}
