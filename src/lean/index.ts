// ── Config ──
export * from "./config";

// ── ABI ──
export { ESCROW_ABI, getEscrowContract, ERC20_ABI } from "./abi/escrow";

// ── Hooks ──
export * from "./hooks";

// ── Utils ──
export * from "./utils";

// ── Context ──
export { CurrencyProvider, useCurrency } from "./context/CurrencyContext";

// ── Components ──
export { default as ConnectButton } from "./components/wallet/ConnectButton";
export { default as ConnectModal } from "./components/wallet/ConnectModal";
export { default as PaymentFlow } from "./components/payment/PaymentFlow";
export { default as TokenSelect } from "./components/payment/TokenSelect";
export { default as Checkout } from "./components/trade/Checkout";
export { default as TradeCard } from "./components/trade/TradeCard";
export { default as TradeStatus } from "./components/trade/TradeStatus";
export { default as TradeActions } from "./components/trade/TradeActions";
export { default as TransactionResult } from "./components/trade/TransactionResult";
export { default as CurrencyToggle } from "./components/common/CurrencyToggle";

// ── Types ──
export type { StableToken } from "./config/tokens";
export type { TradeState } from "./components/trade/TradeStatus";
export type { TradeData } from "./components/trade/TradeCard";
export type { PaymentStep, PaymentParams } from "./hooks/usePayment";
export type { EscrowResult } from "./hooks/useEscrow";
export type { SwapQuote, SwapResult } from "./hooks/useSwap";
export type { TokenBalanceEntry } from "./hooks/useTokenBalances";
export type { ParsedError } from "./utils/errors";
export type { SlippagePreset } from "./config/swap";
