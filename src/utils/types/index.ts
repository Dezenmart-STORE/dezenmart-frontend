export interface UserProfile {
  milestones: {
    sales: number;
    purchases: number;
  };
  _id: string;
  googleId: string;
  email: string;
  name: string;
  profileImage: File | string;
  isMerchant: boolean;
  rating: number;
  totalPoints: number;
  availablePoints: number;
  referralCount: number;
  isReferralCodeUsed: boolean;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  address?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  seller: string;
  images: string[];
  isSponsored: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  reviewer:
    | {
        _id: string;
        name: string;
        profileImage: string;
      }
    | string;
  reviewed:
    | {
        _id: string;
        name: string;
        profileImage: string;
      }
    | string;
  order:
    | {
        _id: string;
        product: string;
      }
    | string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
  };
  buyer: {
    _id: string;
    profileImage: string;
  };
  seller: {
    _id: string;
    name: string;
    profileImage: string;
    rating?: number;
  };
  amount: number;
  status: "pending" | "completed" | "disputed";
  dispute?: {
    raisedBy: string;
    reason: string;
    resolved: boolean;
  };
  createdAt: string;
  quantity: number;
  updatedAt: string;
}

export interface ReferralInfo {
  referralCode: string;
  referralCount: number;
}
export type NotificationType = "update" | "funds" | "buyer" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  timestamp: Date;
  icon?: string;
  link?: string;
}

export type TabType = "1" | "2" | "3" | "4";
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

export interface ReferralItem {
  id: string;
  name: string;
  action?: "from" | "to";
  type: string;
  points: number;
  date: string;
  status?: string;
}

export interface ReferralHistoryProps {
  history: ReferralItem[];
  onInviteFriends: () => void;
}

export interface ReferralData
  extends Omit<ReferralHistoryProps, "onInviteFriends"> {
  activePoints: number;
  usedPoints: number;
  promoCode: string;
}

export type TradeStatusType = "cancelled" | "pending" | "release" | "completed";

export type OrderStatus =
  | "pending"
  | "in escrow"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "disputed";

export interface TradeDetails {
  productName: string;
  productId: string;
  amount: number;
  quantity: number;
  orderTime: string;
  orderNo: string;
  sellerId: string;
  buyerId: string;
  paymentMethod?: string;
  tradeType: "BUY" | "SELL";
}
export interface OrderDetails extends Order {
  formattedDate: string;
  formattedAmount: string;
}

export interface TradeTransactionInfo {
  buyerName: string;
  goodRating: number;
  completedOrders: number;
  completionRate: number;
  avgPaymentTime: number;
}

export interface StatusProps {
  status: TradeStatusType;
  tradeDetails?: TradeDetails;
  transactionInfo?: TradeTransactionInfo;
  onContactSeller?: () => void;
  onContactBuyer?: () => void;
  onOrderDispute?: () => void;
  onReleaseNow?: () => void;
  orderId?: string;
}
