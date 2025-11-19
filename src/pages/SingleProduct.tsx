import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LiaAngleLeftSolid } from "react-icons/lia";
import { FaRegHeart, FaHeart, FaWallet } from "react-icons/fa";
import { IoShareSocialOutline } from "react-icons/io5";
import { HiShieldCheck, HiCurrencyDollar } from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCheckWatchlistQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from "../store/api/watchlistApi";
import { useSEO } from "../utils/hooks/useSEO";
import {
  generateProductSchema,
  generateBreadcrumbSchema,
  SEO_CONFIG,
} from "../utils/seo/seoConfig";

import ProductImage from "../components/product/singleProduct/ProductImage";
import ProductTabs from "../components/product/singleProduct/ProductTabs";
import ProductDetails from "../components/product/singleProduct/ProductDetails";
import CustomerReviews from "../components/product/singleProduct/CustomerReviews";
import PurchaseSection from "../components/product/singleProduct/PurchaseSection";
import ProductLoadingSkeleton from "../components/product/singleProduct/LoadingSkeleton";
import ProductCard from "../components/product/ProductCard";
import { useWeb3 } from "../context/Web3Context";
import Button from "../components/common/Button";
import {
  useGetProductByIdQuery,
  useGetProductsByCategoryQuery,
} from "../store/api/productsApi";
import { useCurrency } from "../context/CurrencyContext";
import { useCurrencyConverter } from "../utils/hooks/useCurrencyConverter";
import { ProductVariant, Product as ProductType } from "../utils/types";
import { useAuth } from "../context/AuthContext";
import WalletConnectionModal from "../components/web3/WalletConnectionModal";

type TabType = "details" | "reviews";

const SingleProduct = () => {
  const { user } = useAuth();
  const { productId } = useParams();
  const navigate = useNavigate();
  const { wallet } = useWeb3();
  const [showWalletModal, setShowWalletModal] = useState(false);

  // RTK Query hooks
  const {
    data: product,
    isLoading: loading,
    error,
  } = useGetProductByIdQuery(productId!, {
    skip: !productId,
  });

  const { data: watchlistStatus } = useCheckWatchlistQuery(productId!, {
    skip: !productId,
  });

  const [addToWatchlist] = useAddToWatchlistMutation();
  const [removeFromWatchlist] = useRemoveFromWatchlistMutation();

  const { data: categoryProducts = [] } = useGetProductsByCategoryQuery(
    (product as ProductType)?.category || "",
    {
      skip: !(product as ProductType)?.category,
    }
  );

  const relatedProducts = categoryProducts
    .filter((p: ProductType) => p._id !== productId)
    .slice(0, 5);

  const { secondaryCurrency, fiatCurrency, selectedTokenSymbol } =
    useCurrency();
  const { formatPrice, convertPrice } = useCurrencyConverter();

  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [reviewCount, setReviewCount] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [showWalletBanner, setShowWalletBanner] = useState(true);
  const isFavorite = watchlistStatus?.isWatchlist || false;

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      setShowWalletModal(true);
      setShowWalletBanner(false);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  // Format product with CORRECT prices
  const formattedProduct = useMemo(() => {
    if (!product) return null;

    const baseProduct = product as ProductType;
    const productPriceUsd = baseProduct.price; // Product price is in USD

    // Convert USD price to different currencies
    const priceInToken = convertPrice(
      productPriceUsd,
      "USD",
      selectedTokenSymbol
    );
    const priceInFiat = convertPrice(productPriceUsd, "USD", "FIAT");
    const priceInCelo = convertPrice(productPriceUsd, "USD", "CELO");

    console.log("💲 Product Price Conversion:", {
      usdPrice: productPriceUsd,
      selectedToken: selectedTokenSymbol,
      priceInToken,
      fiatCurrency,
      priceInFiat,
    });

    return {
      ...baseProduct,
      celoPrice: priceInCelo,
      fiatPrice: priceInFiat,
      tokenPrice: priceInToken,
      formattedCeloPrice: formatPrice(priceInCelo, "CELO"),
      formattedTokenPrice: formatPrice(priceInToken, selectedTokenSymbol),
      formattedUsdtPrice: formatPrice(productPriceUsd, "USDT"),
      formattedFiatPrice: formatPrice(priceInFiat, fiatCurrency),
    };
  }, [product, selectedTokenSymbol, fiatCurrency, convertPrice, formatPrice]);

  // SEO Configuration for product page
  useSEO({
    title: formattedProduct?.name
      ? `${formattedProduct.name} - Buy with Crypto`
      : "Product Details",
    description:
      typeof formattedProduct?.description === "string"
        ? formattedProduct.description.slice(0, 160)
        : "Shop securely with cryptocurrency on DezenMart",
    keywords: [
      ...(formattedProduct?.category
        ? [`${formattedProduct.category}`, `buy ${formattedProduct.category}`]
        : []),
      ...(formattedProduct?.name ? [formattedProduct.name] : []),
      "crypto shopping",
      "buy with crypto",
      "stablecoin payment",
    ],
    image:
      formattedProduct?.images?.[0] ||
      `${SEO_CONFIG.siteUrl}${SEO_CONFIG.openGraph.images.default}`,
    type: "product",
    canonicalUrl: `${SEO_CONFIG.siteUrl}/product/${productId}`,
    structuredData: formattedProduct
      ? [
          // Product Schema
          generateProductSchema({
            name: formattedProduct.name,
            description:
              typeof formattedProduct.description === "string"
                ? formattedProduct.description
                : "",
            price: formattedProduct.price,
            currency: "USD",
            images: formattedProduct.images || [],
            category: formattedProduct.category,
            seller:
              typeof formattedProduct.seller === "object"
                ? { name: formattedProduct.seller?.name || "DezenMart Seller" }
                : undefined,
            rating: formattedProduct.seller.rating,
            reviewCount: reviewCount,
          }),
          // Breadcrumb Schema
          generateBreadcrumbSchema([
            { name: "Home", url: SEO_CONFIG.siteUrl },
            { name: "Products", url: `${SEO_CONFIG.siteUrl}/product` },
            ...(formattedProduct.category
              ? [
                  {
                    name: formattedProduct.category,
                    url: `${
                      SEO_CONFIG.siteUrl
                    }/product/category/${formattedProduct.category.toLowerCase()}`,
                  },
                ]
              : []),
            {
              name: formattedProduct.name,
              url: `${SEO_CONFIG.siteUrl}/product/${productId}`,
            },
          ]),
        ]
      : undefined,
  });

  const handleGoBack = () => navigate(-1);

  const handleToggleFavorite = async () => {
    if (productId) {
      try {
        if (watchlistStatus?.isWatchlist) {
          await removeFromWatchlist(productId).unwrap();
        } else {
          await addToWatchlist(productId).unwrap();
        }
      } catch (error) {
        console.error("Failed to toggle watchlist:", error);
      }
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (!variant) return;
    setSelectedVariant(variant);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: formattedProduct?.name || "Check out this product",
          text:
            typeof formattedProduct?.description === "string"
              ? formattedProduct.description.slice(0, 100)
              : "I found this amazing product",
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing product:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  useEffect(() => {
    setActiveTab("details");
    window.scrollTo(0, 0);
  }, [productId]);

  // Simplify price display logic - MUST be before early returns
  const displayPrice = useMemo(() => {
    if (!formattedProduct) return null;

    // Priority: Show in user's preferred currency
    if (secondaryCurrency === "TOKEN") {
      return {
        primary: formattedProduct.formattedTokenPrice,
        secondary: formattedProduct.price,
      };
    }

    return {
      primary: formattedProduct.formattedFiatPrice,
      secondary: formattedProduct.price,
    };
  }, [formattedProduct, secondaryCurrency]);

  useEffect(() => {
    if (
      !loading &&
      formattedProduct?.type &&
      Array.isArray(formattedProduct.type) &&
      formattedProduct.type.length > 0
    ) {
      const firstAvailableVariant =
        formattedProduct.type.find(
          (variant: ProductVariant) => variant.quantity > 0
        ) || formattedProduct.type[0];

      handleVariantSelect(firstAvailableVariant);
    } else {
      setSelectedVariant(null);
    }
  }, [formattedProduct, loading]);

  if (loading || !formattedProduct) {
    return <ProductLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-Dark min-h-screen flex items-center justify-center">
        <div className="bg-[#292B30] p-8 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4">Cannot Find Product</h2>
          <p className="text-gray-400 mb-6">
            Sorry, we couldn't find the product you're looking for.
          </p>
          <button
            onClick={handleGoBack}
            className="bg-Red text-white py-2 px-6 rounded-md hover:bg-[#d52a33] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const backgroundStyle = {
    background: `linear-gradient(to bottom, #292B30 0%, rgba(41, 43, 48, 0.95) 100%)`,
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-Dark min-h-screen"
      >
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Wallet Connection Banner */}
          <AnimatePresence>
            {!wallet.isConnected && showWalletBanner && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 bg-gradient-to-r from-red-600/20 to-red-500/10 border border-red-500/30 rounded-xl p-3 sm:p-4 backdrop-blur-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <HiShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm sm:text-base">
                        Connect Your Wallet to Buy
                      </h3>
                      <p className="text-gray-400 text-xs sm:text-sm leading-tight mt-0.5">
                        <span className="hidden sm:inline">
                          Secure payments with crypto • No fees • Instant escrow
                          protection
                        </span>
                        <span className="sm:hidden">
                          Secure crypto payments • Instant escrow
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => setShowWalletBanner(false)}
                      className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 flex-shrink-0 sm:hidden"
                      aria-label="Dismiss banner"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2 sm:flex-shrink-0">
                    <Button
                      title="Connect"
                      icon={<FaWallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      onClick={handleConnectWallet}
                      className="bg-red-600 self-end hover:bg-red-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 transition-all duration-200 whitespace-nowrap"
                    />
                    <button
                      onClick={() => setShowWalletBanner(false)}
                      className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 flex-shrink-0 hidden sm:block"
                      aria-label="Dismiss banner"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Wallet Connected Banner */}
            {wallet.isConnected && showWalletBanner && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 bg-gradient-to-r from-green-600/20 to-green-500/10 border border-green-500/30 rounded-xl p-3 sm:p-4 backdrop-blur-sm"
              >
                <div className="flex flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <HiCurrencyDollar className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm sm:text-base flex items-center gap-2">
                        <span>Wallet Connected</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                      </h3>
                      <p className="text-gray-400 text-xs sm:text-sm font-mono truncate">
                        {wallet.address &&
                          `${wallet.address.slice(
                            0,
                            6
                          )}...${wallet.address.slice(-4)}`}{" "}
                        <span className="hidden sm:inline">• </span>
                        <span className="block sm:inline mt-0.5 sm:mt-0">
                          {wallet.tokenBalances[wallet.selectedToken.symbol]
                            ?.formatted || "0 " + wallet.selectedToken.symbol}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWalletBanner(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 self-start sm:self-center flex-shrink-0"
                    aria-label="Dismiss banner"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col xl:flex-row gap-6">
            <div
              style={backgroundStyle}
              className="w-full xl:w-5/12 rounded-xl shadow-lg transition-all duration-500"
            >
              <div className="relative flex flex-col items-center p-4 sm:p-6 h-full">
                {/* Navigation Controls */}
                <div className="flex items-center justify-between w-full absolute top-4 px-2 sm:px-4 z-10">
                  <button
                    onClick={handleGoBack}
                    aria-label="Go back"
                    className="hover:opacity-80 transition-opacity p-2.5 bg-black/20 backdrop-blur-sm rounded-full"
                  >
                    <LiaAngleLeftSolid className="text-xl sm:text-2xl text-white" />
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={handleShare}
                      aria-label="Share product"
                      className="hover:opacity-80 transition-opacity p-2.5 bg-black/20 backdrop-blur-sm rounded-full"
                    >
                      <IoShareSocialOutline className="text-xl sm:text-2xl text-white" />
                    </button>

                    <button
                      onClick={handleToggleFavorite}
                      aria-label={
                        isFavorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      className="hover:opacity-80 transition-opacity p-2.5 bg-black/20 backdrop-blur-sm rounded-full"
                    >
                      {isFavorite ? (
                        <FaHeart className="text-xl sm:text-2xl text-Red" />
                      ) : (
                        <FaRegHeart className="text-xl sm:text-2xl text-white" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Product Image */}
                <ProductImage
                  images={formattedProduct.images}
                  productName={formattedProduct.name}
                  productCategory={formattedProduct.category}
                />
              </div>
            </div>

            <div className="w-full xl:w-7/12">
              <div className="bg-[#292B30] shadow-xl text-white w-full rounded-xl overflow-hidden">
                <div className="px-4 sm:px-8 md:px-12 py-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl sm:text-3xl font-bold break-words line-clamp-2 leading-tight">
                        {formattedProduct.name}
                      </h1>
                      {formattedProduct.name.length > 60 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Tap to see full title
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 sm:text-right flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-red-500 whitespace-nowrap">
                          {displayPrice?.primary}
                        </span>
                      </div>
                      {/* {displayPrice?.secondary &&
                      displayPrice.primary !== displayPrice.secondary && (
                        <span className="text-sm text-gray-400">
                          ≈ {displayPrice.secondary}
                        </span>
                      )} */}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <ProductTabs
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  reviewCount={reviewCount}
                />

                {/* Tab Content */}
                <div className="transition-all duration-300">
                  {activeTab === "details" ? (
                    <ProductDetails
                      product={formattedProduct}
                      onVariantSelect={handleVariantSelect}
                    />
                  ) : (
                    <CustomerReviews
                      productId={formattedProduct._id}
                      reviewcount={setReviewCount}
                    />
                  )}
                </div>

                {typeof formattedProduct.seller === "object" &&
                  formattedProduct.seller?._id !== user?._id && (
                    <PurchaseSection
                      product={formattedProduct}
                      selectedVariant={selectedVariant as ProductVariant}
                    />
                  )}
              </div>
            </div>
          </div>
          {/* Related Products Section with Loading State */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Related Products
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
              {loading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="bg-[#292B30] rounded-xl overflow-hidden animate-pulse"
                  >
                    <div className="aspect-square bg-gray-700" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : relatedProducts.length > 0 ? (
                relatedProducts.map((product) => {
                  if (!product) return null;
                  return <ProductCard key={product?._id} product={product} />;
                })
              ) : (
                <div className="col-span-full text-center py-8 text-gray-400">
                  No related products found
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
};

export default SingleProduct;
