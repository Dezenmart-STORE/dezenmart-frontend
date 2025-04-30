import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LiaAngleLeftSolid } from "react-icons/lia";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import { IoShareSocialOutline } from "react-icons/io5";
import { motion } from "framer-motion";

import ProductImage from "../components/product/singleProduct/ProductImage";
import ProductTabs from "../components/product/singleProduct/ProductTabs";
import ProductDetails from "../components/product/singleProduct/ProductDetails";
import CustomerReviews from "../components/product/singleProduct/CustomerReviews";
import PurchaseSection from "../components/product/singleProduct/PurchaseSection";
import ProductLoadingSkeleton from "../components/product/singleProduct/LoadingSkeleton";
// import ProductList from "../components/product/ProductList";
import { useProductData } from "../utils/hooks/useProductData";
import ProductCard from "../components/product/ProductCard";

type TabType = "details" | "reviews";

const SingleProduct = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const {
    product,
    formattedProduct,
    loading,
    error,
    fetchProductById,
    relatedProducts,
  } = useProductData();
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  const handleGoBack = () => navigate(-1);

  const toggleFavorite = () => {
    setIsFavorite((prev) => !prev);
    // favorite/wishlist logic
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name || "Check out this product",
          text:
            product?.description?.slice(0, 100) ||
            "I found this amazing product",
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
    if (productId) {
      fetchProductById(productId);
      setActiveTab("details");
    }

    window.scrollTo(0, 0);

    // Cleanup
    return () => {};
  }, [productId, fetchProductById]);
  // useEffect(() => {
  //   if (product) {
  //     // Mock review count for now
  //     setReviewCount(4);
  //   }
  // }, [product]);

  if (loading || !product) {
    return <ProductLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-Dark min-h-screen flex items-center justify-center">
        <div className="bg-[#292B30] p-8 rounded-xl shadow-lg">
          <h2 className="text-Red text-xl font-bold mb-4">
            Error Loading Product
          </h2>
          <p className="text-white mb-6">{error}</p>
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

  const ethPrice =
    formattedProduct?.formattedPrice || (product.price / 1000000).toFixed(6);

  const backgroundStyle = {
    background: `linear-gradient(to bottom, #292B30 0%, rgba(41, 43, 48, 0.95) 100%)`,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-Dark min-h-screen"
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
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
                    onClick={toggleFavorite}
                    aria-label={
                      isFavorite ? "Remove from favorites" : "Add to favorites"
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
              <ProductImage images={product.images} />
            </div>
          </div>

          <div className="w-full xl:w-7/12">
            <div className="bg-[#292B30] shadow-xl text-white w-full rounded-xl overflow-hidden">
              <div className="px-4 sm:px-8 md:px-12 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    {product.name}
                  </h1>
                  <div className="flex items-center">
                    <span className="text-xl sm:text-2xl font-bold">
                      {ethPrice} ETH
                    </span>
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
                  <ProductDetails product={product} ethPrice={ethPrice} />
                ) : (
                  <CustomerReviews
                    productId={product._id}
                    reviewcount={setReviewCount}
                  />
                )}
              </div>

              <PurchaseSection product={product} />
            </div>
          </div>
        </div>
        <div className="mt-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
            {relatedProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SingleProduct;
