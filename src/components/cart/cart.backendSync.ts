/**
 * cart.backendSync.ts
 *
 * All functions here are fire-and-forget wrappers around the DezenMart REST
 * API. They NEVER throw — any failure is logged and swallowed so the cart
 * always keeps working with localStorage + blockchain as the source of truth.
 *
 * When the backend gets the cart endpoints fully live, swap the fetch calls
 * to the RTK Query mutation hooks — no changes needed in CartProvider.
 *
 * Relevant API routes (from api-docs):
 *   POST   /cart              → add / create cart
 *   PUT    /cart/:productId   → update quantity
 *   DELETE /cart/:productId   → remove item
 *   GET    /cart              → fetch cart (for login sync)
 */

const BASE = import.meta.env.VITE_API_URL ?? "https://dezenmart-server.onrender.com/api";

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem("token") ??
    sessionStorage.getItem("token") ??
    "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safely(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.warn("[Cart sync]", err);
  }
}

/** Sync the full local cart to the backend (called on login or periodic save) */
export async function syncCartToBackend(
  items: { productId: string; tradeId: number; quantity: number }[]
): Promise<void> {
  return safely(async () => {
    if (!items.length) return;
    await fetch(`${BASE}/cart/sync`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ items }),
    });
  });
}

/** Notify backend when an item is added */
export async function backendAddToCart(
  productId: string,
  quantity: number,
  tradeId: number
): Promise<void> {
  return safely(async () => {
    await fetch(`${BASE}/cart`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ product: productId, quantity, tradeId }),
    });
  });
}

/** Notify backend of quantity change */
export async function backendUpdateCartItem(
  productId: string,
  quantity: number
): Promise<void> {
  return safely(async () => {
    await fetch(`${BASE}/cart/${productId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ quantity }),
    });
  });
}

/** Notify backend of item removal */
export async function backendRemoveCartItem(productId: string): Promise<void> {
  return safely(async () => {
    await fetch(`${BASE}/cart/${productId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  });
}

/** Fetch cart from backend (for merging on login) */
export async function backendFetchCart(): Promise<
  { productId: string; quantity: number; tradeId: number }[]
> {
  try {
    const res = await fetch(`${BASE}/cart`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    // normalise whatever shape the backend returns
    const items = data?.data ?? data?.items ?? data ?? [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}
