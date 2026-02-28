import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { WatchlistItem } from "../../../utils/types";
import { useCurrency } from "../../../lean";

interface Props {
  item: WatchlistItem;
  index: number;
  onRemove: (productId: string) => Promise<boolean>;
}

const SavedItem: React.FC<Props> = React.memo(({ item, onRemove }) => {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const productImage = useMemo(
    () => item.product?.images?.[0] || "https://placehold.co/64x64?text=?",
    [item.product?.images]
  );

  const price = useMemo(
    () => formatAmount(item.product?.price ?? 0, item.product?.paymentToken ?? "cUSD"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.product?.price, item.product?.paymentToken]
  );

  return (
    <div className="bg-[#292B30] rounded-xl p-3 flex items-center gap-3">
      <button
        onClick={() => navigate(`/product/${item.product._id}`)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <img
          src={productImage}
          alt={item.product?.name ?? "Product"}
          loading="lazy"
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-[#1a1c20]"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">
            {item.product?.name ?? "Unknown Product"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {item.product?.seller ?? "Unknown Seller"}
          </p>
          <p className="text-sm font-medium text-white mt-1.5">{price}</p>
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.product._id);
        }}
        aria-label="Remove from saved"
        className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

SavedItem.displayName = "SavedItem";
export default SavedItem;
