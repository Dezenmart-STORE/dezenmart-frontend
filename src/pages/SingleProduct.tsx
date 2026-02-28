import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LiaAngleLeftSolid } from "react-icons/lia";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import { IoShareSocialOutline } from "react-icons/io5";
import { motion } from "framer-motion";
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
import { useAccount } from "wagmi";
import {
  useGetProductByIdQuery,
  useGetProductsByCategoryQuery,
} from "../store/api/productsApi";
import { useCurrency } from "../lean";
import { ProductVariant, Product as ProductType } from "../utils/types";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "../context/SnackbarContext";

type TabType = "details" | "reviews";

const SingleProduct = () => {
  const { user } = useAuth();
  const { productId } = useParams();
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { showSnackbar } = useSnackbar();

  const {
    data: product,
    isLoading: loading,
    error,
  } = useGetProductByIdQuery(productId!, { skip: !productId });

  const { data: watchlistStatus } = useCheckWatchlistQuery(productId!, {
    skip: !productId,
  });

  const [addToWatchlist] = useAddToWatchlistMutation();
  const [removeFromWatchlist] = useRemoveFromWatchlistMutation();

  const { data: categoryProducts = [] } = useGetProductsByCategoryQuery(
    (product as ProductType)?.category || "",
    { skip: !(product as ProductType)?.category }
  );

  const relatedProducts = categoryProducts
    .filter((p: ProductType) => p._id !== productId)
    .slice(0, 5);

  const { secondaryCurrency, fiatCurrency, selectedTokenSymbol, formatPrice, convertPrice } =
    useCurrency();

  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [reviewCount, setReviewCount] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const isFavorite = watchlistStatus?.isWatchlist || false;

  const formattedProduct = useMemo(() => {
    if (!product) return null;

    const base = product as ProductType;
    const productPriceUsd = base.price;

    const priceInToken = convertPrice(productPriceUsd, "USD", selectedTokenSymbol);
    const priceInFiat = convertPrice(productPriceUsd, "USD", "FIAT");
    const priceInCelo = convertPrice(productPriceUsd, "USD", "CELO");

    return {
      ...base,
      celoPrice: priceInCelo,
      fiatPrice: priceInFiat,
      tokenPrice: priceInToken,
      formattedCeloPrice: formatPrice(priceInCelo, "CELO"),
      formattedTokenPrice: formatPrice(priceInToken, selectedTokenSymbol),
      formattedUsdtPrice: formatPrice(productPriceUsd, "USDT"),
      formattedFiatPrice: formatPrice(priceInFiat, fiatCurrency),
    };
  }, [product, selectedTokenSymbol, fiatCurrency, convertPrice, formatPrice]);

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
        ? [formattedProduct.category, `buy ${formattedProduct.category}`]
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
            reviewCount,
          }),
          generateBreadcrumbSchema([
            { name: "Home", url: SEO_CONFIG.siteUrl },
            { name: "Products", url: `${SEO_CONFIG.siteUrl}/product` },
            ...(formattedProduct.category
              ? [
                  {
                    name: formattedProduct.category,
                    url: `${SEO_CONFIG.siteUrl}/product/category/${formattedProduct.category.toLowerCase()}`,
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

  useEffect(() => {
    setActiveTab("details");
    window.scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    if (
      !loading &&
      formattedProduct?.type &&
      Array.isArray(formattedProduct.type) &&
      formattedProduct.type.length > 0
    ) {
      const first =
        formattedProduct.type.find((v: ProductVariant) => v.quantity > 0) ||
        formattedProduct.type[0];
      setSelectedVariant(first);
    } else {
      setSelectedVariant(null);
    }
  }, [formattedProduct, loading]);

  const displayPrice = useMemo(() => {
    if (!formattedProduct) return null;
    if (secondaryCurrency === "TOKEN") {
      return formattedProduct.formattedTokenPrice;
    }
    return formattedProduct.formattedFiatPrice;
  }, [formattedProduct, secondaryCurrency]);

  const handleGoBack = () => navigate(-1);

  const handleToggleFavorite = async () => {
    if (!productId) return;
    try {
      if (watchlistStatus?.isWatchlist) {
        await removeFromWatchlist(productId).unwrap();
      } else {
        await addToWatchlist(productId).unwrap();
      }
    } catch {
      // silent — watchlist is non-critical
    }
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
      } catch {
        // user cancelled share sheet — no action needed
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showSnackbar("Link copied to clipboard!", "success");
      } catch {
        showSnackbar("Could not copy link. Please copy the URL manually.", "error");
      }
    }
  };

  if (loading || !formattedProduct) {
    return <ProductLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-Dark min-h-screen flex items-center justify-center p-4">
        <div className="bg-[#292B30] p-8 rounded-xl shadow-lg text-center max-w-sm w-full">
          <h2 className="text-xl font-bold text-white mb-3">
            Product Not Found
          </h2>
          <p className="text-gray-400 mb-6 text-sm">
            Sorry, we couldn't find the product you're looking for.
          </p>
          <button
            onClick={handleGoBack}
            className="bg-red-600 text-white py-2 px-6 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-Dark min-h-screen"
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left column — image */}
          <div
            className="w-full xl:w-5/12 rounded-xl shadow-lg"
            style={{
              background:
                "linear-gradient(to bottom, #292B30 0%, rgba(41,43,48,0.95) 100%)",
            }}
          >
            <div className="relative flex flex-col items-center p-4 sm:p-6 h-full">
              {/* Nav controls */}
              <div className="flex items-center justify-between w-full absolute top-4 px-2 sm:px-4 z-10">
                <button
                  onClick={handleGoBack}
                  aria-label="Go back"
                  className="p-2.5 bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/40 transition-colors"
                >
                  <LiaAngleLeftSolid className="text-xl text-white" />
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleShare}
                    aria-label="Share product"
                    className="p-2.5 bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/40 transition-colors"
                  >
                    <IoShareSocialOutline className="text-xl text-white" />
                  </button>

                  <button
                    onClick={handleToggleFavorite}
                    aria-label={
                      isFavorite ? "Remove from favorites" : "Add to favorites"
                    }
                    className="p-2.5 bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/40 transition-colors"
                  >
                    {isFavorite ? (
                      <FaHeart className="text-xl text-Red" />
                    ) : (
                      <FaRegHeart className="text-xl text-white" />
                    )}
                  </button>
                </div>
              </div>

              <ProductImage
                images={formattedProduct.images}
                productName={formattedProduct.name}
                productCategory={formattedProduct.category}
              />
            </div>
          </div>

          {/* Right column — product info */}
          <div className="w-full xl:w-7/12">
            <div className="bg-[#292B30] shadow-xl text-white w-full rounded-xl overflow-hidden">
              {/* Name + price header */}
              <div className="px-4 sm:px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <h1 className="flex-1 min-w-0 text-xl sm:text-2xl font-bold break-words leading-snug">
                    {formattedProduct.name}
                  </h1>
                  <span className="text-2xl font-bold text-red-500 whitespace-nowrap sm:text-right flex-shrink-0">
                    {displayPrice}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <ProductTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                reviewCount={reviewCount}
              />

              {/* Tab content */}
              {activeTab === "details" ? (
                <ProductDetails
                  product={formattedProduct}
                  onVariantSelect={(v) => setSelectedVariant(v)}
                />
              ) : (
                <CustomerReviews
                  productId={formattedProduct._id}
                  reviewcount={setReviewCount}
                />
              )}

              {/* Purchase section — only show if viewer is not the seller */}
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

        {/* Related products */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Related Products
          </h2>
          {relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5 md:gap-4">
              {relatedProducts.map((p) =>
                p ? <ProductCard key={p._id} product={p} /> : null
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-6">
              No related products found
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SingleProduct;
