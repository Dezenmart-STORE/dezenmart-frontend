import { memo } from "react";
import { HiCheckCircle, HiExclamationTriangle, HiSignal } from "react-icons/hi2";
import { LOW_STOCK_THRESHOLD } from "./stock";

/**
 * How many are left, beside the quantity picker. Its own file so a checkout
 * can use it without loading the wallet checkout around it.
 */
const StockStatus = memo(({ availableQty }: { availableQty: number }) => {
  const isOutOfStock = availableQty <= 0;
  const isLowStock = availableQty > 0 && availableQty < LOW_STOCK_THRESHOLD;
  return (
    <div className="text-xs">
      {isOutOfStock ? (
        <span className="text-red-400 font-medium flex items-center gap-1">
          <HiExclamationTriangle className="w-3 h-3" aria-hidden /> Out of stock
        </span>
      ) : isLowStock ? (
        <span className="text-yellow-500 flex items-center gap-1">
          <HiSignal className="w-3 h-3" aria-hidden /> Only {availableQty} left
        </span>
      ) : (
        <span className="text-green-500 flex items-center gap-1">
          <HiCheckCircle className="w-3 h-3" aria-hidden /> {availableQty} available
        </span>
      )}
    </div>
  );
});
StockStatus.displayName = "StockStatus";

export default StockStatus;
