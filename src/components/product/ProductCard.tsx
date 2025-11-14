import React, { useMemo, startTransition } from "react";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { Product } from "../../utils/types";
import {
  useCheckWatchlistQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from "../../store/api";
import { useCurrency } from "../../context/CurrencyContext";
import { useCurrencyConverter } from "../../utils/hooks/useCurrencyConverter";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";

interface ProductCardProps {
  product: Product;
  isNew?: boolean;
  hideFavorite?: boolean;
}

const ProductCard = React.memo(
  ({ product, isNew = false, hideFavorite = false }: ProductCardProps) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { showSnackbar } = useSnackbar();
    const { _id, name, description, images, isSponsored, price, paymentToken } =
      product;
    const { secondaryCurrency, fiatCurrency, selectedTokenSymbol } =
      useCurrency();
    const { convertPrice, formatPrice } = useCurrencyConverter();

    // RTK Query hooks - only fetch watchlist status when authenticated
    const { data: watchlistData } = useCheckWatchlistQuery(_id, {
      skip: !isAuthenticated,
    });
    const [addToWatchlist] = useAddToWatchlistMutation();
    const [removeFromWatchlist] = useRemoveFromWatchlistMutation();

    const isFavorite = watchlistData?.isWatchlist || false;

    // Calculate formatted prices
    // IMPORTANT: Product prices from backend are in USD
    const formattedPrices = useMemo(() => {
      // Since price is in USD, convert from USD to other currencies
      const usdtPrice = convertPrice(price, "USD", "USDT");
      const fiatPrice = convertPrice(price, "USD", "FIAT");
      const tokenPrice = convertPrice(price, "USD", selectedTokenSymbol);

      console.log(`💲 Product Price Conversion (${name}):`, {
        originalUSD: price,
        toUSDT: usdtPrice,
        toFIAT: fiatPrice,
        toToken: tokenPrice,
        selectedToken: selectedTokenSymbol,
      });

      return {
        formattedUsdtPrice: formatPrice(usdtPrice, "USDT"),
        formattedFiatPrice: formatPrice(fiatPrice, "FIAT"),
        formattedTokenPrice: formatPrice(tokenPrice, selectedTokenSymbol),
      };
    }, [price, selectedTokenSymbol, convertPrice, formatPrice, name]);

    // Price display respects user's currency toggle preference
    const { primaryPrice, secondaryPrice } = useMemo(() => {
      if (secondaryCurrency === "TOKEN") {
        // User prefers to see token prices
        return {
          primaryPrice: formattedPrices.formattedTokenPrice,
          secondaryPrice: formattedPrices.formattedUsdtPrice,
        };
      }

      // User prefers to see fiat prices
      return {
        primaryPrice: formattedPrices.formattedFiatPrice,
        secondaryPrice: formattedPrices.formattedUsdtPrice,
      };
    }, [secondaryCurrency, formattedPrices]);

    const imageUrl =
      images && images.length > 0
        ? images[0]
        : "https://placehold.co/300x300?text=No+Image";

    const handleToggleFavorite = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isAuthenticated) {
        showSnackbar("Please log in to save products to your wishlist", "info");
        return;
      }

      if (isFavorite) {
        await removeFromWatchlist(_id);
      } else {
        await addToWatchlist(_id);
      }
    };

    const navigateToProduct = (e: React.MouseEvent) => {
      e.preventDefault();
      startTransition(() => {
        navigate(`/product/${_id}`);
      });
    };

    return (
      <motion.div
        whileHover={{ y: -5 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="h-full"
      >
        <Link
          to={`/product/${_id}`}
          className="bg-[#292B30] rounded-lg relative flex flex-col overflow-hidden h-full shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          {/* Top section with New tag and favorite */}
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-between p-2 sm:p-3">
            {isNew && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-full p-1.5 sm:p-2 bg-red-500/80 text-white text-xs font-bold"
              >
                New
              </motion.div>
            )}
            {!hideFavorite && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                className={`ml-auto bg-[#1A1B1F]/50 rounded-full p-1.5 sm:p-2 backdrop-blur-md ${
                  !isNew ? "mr-0" : ""
                }`}
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                onClick={handleToggleFavorite}
              >
                {isFavorite ? (
                  <FaHeart className="text-base sm:text-xl text-Red" />
                ) : (
                  <FaRegHeart className="text-base sm:text-xl text-white" />
                )}
              </motion.button>
            )}
          </div>

          {/* Image container */}
          <div className="w-full pt-[100%] relative bg-[#1A1B1F]/30 overflow-hidden">
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img
                src={imageUrl}
                alt={`${name} - ${
                  product.category || "Product"
                } - Buy with crypto | DezenMart`}
                className="max-w-full max-h-full object-contain"
                width="300"
                height="300"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          </div>

          {/* Product info */}
          <div className="flex flex-col w-full p-3 sm:p-4 flex-grow">
            {isSponsored && (
              <div className="mb-1">
                <span className="text-Green text-xs font-medium bg-Green/10 px-2 py-0.5 rounded-md border border-Green/20">
                  Sponsored
                </span>
              </div>
            )}

            <h4 className="text-white text-sm sm:text-base md:text-lg font-bold truncate">
              {name}
            </h4>
            {/* <div className="flex items-center gap-1 text-xs md:text-sm text-[#AEAEB2] py-0.5 sm:py-1">
              <span>
                By {typeof seller === "string" ? seller : "Unknown Seller"}
              </span>
              <RiVerifiedBadgeFill className="text-[#4FA3FF] text-xs" />
            </div> */}
            <p className="text-white/80 text-xs md:text-sm py-0.5 sm:py-1 line-clamp-1 ">
              {description}
            </p>

            {/* Price and buy button container */}
            <div className="mt-auto pt-1 sm:pt-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-white text-base md:text-lg font-bold">
                  {primaryPrice}
                </span>
                {primaryPrice !== secondaryPrice && (
                  <span className="text-[#AEAEB2] text-xs md:text-sm">
                    ≈ {secondaryPrice}
                  </span>
                )}
              </div>

              {/* <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-2 sm:mt-3 gap-2 font-medium text-white bg-Red py-2 sm:py-2.5 rounded-md flex justify-center items-center w-full transition-all duration-300"
                onClick={navigateToProduct}
              >
                <span>Buy Now</span>
                <BsCart3 className="text-lg" />
              </motion.button> */}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }
);

export default ProductCard;
