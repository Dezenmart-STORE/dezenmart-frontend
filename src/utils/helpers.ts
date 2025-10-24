export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  wait: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<F>) {
    const context = this;

    if (timeout) clearTimeout(timeout);

    return new Promise<ReturnType<F>>((resolve) => {
      timeout = setTimeout(() => {
        const result = func.apply(context, args);
        resolve(result);
        timeout = null;
      }, wait);
    });
  };
};

// order storage
const ORDER_ID_KEY = "current_order_id";

export const storeOrderId = (orderId: string): void => {
  localStorage.setItem(ORDER_ID_KEY, orderId);
};

export const getStoredOrderId = (): string | null => {
  return localStorage.getItem(ORDER_ID_KEY);
};

export const clearStoredOrderId = (): void => {
  localStorage.removeItem(ORDER_ID_KEY);
};


export function objectToQueryParams(params: Record<string, string | number | boolean>): string {
    const searchParams = new URLSearchParams();
    
    // Iterate through the object's keys and append them to URLSearchParams
    for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            // Convert the value to a string before appending
            searchParams.append(key, String(params[key]));
        }
    }

    // URLSearchParams.toString() returns "key1=value1&key2=value2", so we prepend '?'
    const queryString = searchParams.toString();
    return queryString ? `${queryString}` : '';
}


export function generateUniqueNumericalId(): number {
    // The current timestamp in milliseconds (typically 13 digits)
    const timestamp = Date.now();
    
    // Add a small, 3-digit random number to the end to prevent collisions 
    // if multiple trades are submitted within the same millisecond.
    // We multiply by 1000 and floor it to ensure it stays an integer.
    const randomSuffix = Math.floor(Math.random() * 1000); 
    
    // Concatenate the two, ensuring the final number fits within JavaScript's safe integer limit (53 bits).
    // A 13-digit timestamp plus a 3-digit suffix is 16 digits, well within the 18-19 digit safety margin for u64.
    return timestamp * 1000 + randomSuffix;
}