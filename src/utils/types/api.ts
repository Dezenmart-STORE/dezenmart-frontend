import { TradeStatusType, TradeTransactionInfo } from ".";

export interface TradeOrderDetails {
 
  productName: string;
  amount: string;
  quantity: number;
  orderTime: string;
  orderNo: string;
  paymentMethod?: string;
  tradeType: "BUY" | "SELL";
  amountNumeric?: number;
  sellerId?: string;
  buyerId?: string;
  _id?: string;
}

export interface TradeStatusProps {
  status: TradeStatusType;
  orderDetails: TradeOrderDetails;
  transactionInfo: TradeTransactionInfo;
  onContactSeller?: () => void;
  onOrderDispute?: () => void;
  onReleaseNow?: () => void;
  orderId?: string;
}

export interface OrderCreateRequest {
  product: string;
  buyer: string;
  seller: string;
  amount: number;
  status: string;
}

export interface TradeCreateRequest {
  orderId: string;
  buyer: string;
  seller: string;
  amount: number;
  status: string;
}