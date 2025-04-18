export type TabType = "1" | "2" | "3";
export type TradeTab = "buy" | "sell" | "active" | "completed";

export interface TabOption {
  id: TabType;
  label: string;
}

export interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  options: TabOption[];
}


export interface Product {
  id: string;
  name: string;
  image: string;
  price: string;
  quantity: string;
  minCost: string;
  description: string;
  orders: number;
  rating: number;
  seller: string;
  status?: string;
  timeRemaining?: string;
  escrowStatus?: string;
  paymentStatus?: string;
}