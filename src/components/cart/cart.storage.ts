import type { CartItem } from "./cart.types";

const KEY = "dezenmart_cart_v1";

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // quota exceeded or SSR – silently ignore
  }
}

export function clearPersistedCart(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
