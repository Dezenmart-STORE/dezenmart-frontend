import type { Notification } from './types';
import {
  HiOutlineBell,
  HiOutlineCurrencyDollar,
  HiOutlineShoppingBag,
  HiOutlineInformationCircle,
  HiOutlineChatAlt2,
  HiOutlineUsers,
  HiOutlineCube,
} from 'react-icons/hi';
import type { IconType } from 'react-icons';

// ---------- Deep-link routing ----------

export function getNotificationRoute(n: Notification): string | null {
  const { type, metadata } = n;
  const t = type.toUpperCase();

  if (t === 'ORDER_PLACED' || t === 'ORDER_UPDATE' || t === 'ORDER') {
    if (metadata?.orderId) return `/orders/${metadata.orderId}`;
  }

  if (t === 'NEW_MESSAGE' || t === 'MESSAGE') {
    // API uses metadata.sender for message notifications
    const senderId = metadata?.sender ?? metadata?.senderId;
    if (senderId) return `/chat/${senderId}`;
    return '/chat';
  }

  if (t === 'TRADE' || t === 'BUYER') {
    if (metadata?.tradeId) return `/trades/viewtrades/${metadata.tradeId}`;
    if (metadata?.orderId) return `/orders/${metadata.orderId}`;
  }

  if (t === 'FUNDS' || t === 'PAYMENT') {
    return '/account';
  }

  if (t === 'REFERRAL') {
    return '/account';
  }

  if (t === 'PRODUCT') {
    if (metadata?.productId) return `/product/${metadata.productId}`;
  }

  return null;
}

// ---------- Time formatting ----------

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';

  const date = new Date(iso);
  const nowDate = new Date();

  // Same week → show weekday name
  const startOfWeek = new Date(nowDate);
  startOfWeek.setDate(nowDate.getDate() - nowDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  if (date >= startOfWeek) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Same year → "Jan 15"
  if (date.getFullYear() === nowDate.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------- Icon + color mapping ----------

interface NotificationMeta {
  icon: IconType;
  color: string;
  bgColor: string;
  label: string;
}

export function getNotificationMeta(type: string): NotificationMeta {
  const t = type.toUpperCase();

  if (t === 'ORDER_PLACED' || t === 'ORDER_UPDATE' || t === 'ORDER') {
    return { icon: HiOutlineCube, color: 'text-orange-400', bgColor: 'bg-orange-500/20', label: 'Order' };
  }
  if (t === 'NEW_MESSAGE' || t === 'MESSAGE') {
    return { icon: HiOutlineChatAlt2, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Message' };
  }
  if (t === 'TRADE' || t === 'BUYER') {
    return { icon: HiOutlineShoppingBag, color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'Trade' };
  }
  if (t === 'FUNDS' || t === 'PAYMENT') {
    return { icon: HiOutlineCurrencyDollar, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Payment' };
  }
  if (t === 'REFERRAL') {
    return { icon: HiOutlineUsers, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Referral' };
  }
  if (t === 'PRODUCT') {
    return { icon: HiOutlineCube, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', label: 'Product' };
  }

  return { icon: HiOutlineInformationCircle, color: 'text-gray-400', bgColor: 'bg-gray-500/20', label: 'Update' };
}

// ---------- Date grouping ----------

interface NotificationGroup {
  label: string;
  items: Notification[];
}

export function groupByDate(notifications: Notification[]): NotificationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This week': [],
    Earlier: [],
  };

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (dayStart >= today) {
      groups['Today'].push(n);
    } else if (dayStart >= yesterday) {
      groups['Yesterday'].push(n);
    } else if (dayStart >= weekAgo) {
      groups['This week'].push(n);
    } else {
      groups['Earlier'].push(n);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
