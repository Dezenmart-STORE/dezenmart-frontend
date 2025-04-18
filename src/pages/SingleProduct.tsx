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
import ProductList from "../components/product/ProductList";
// import { CartContext } from "../contexts/CartContext";
// import { FavoritesContext } from "../contexts/FavoritesContext";

type TabType = "details" | "reviews";

const SingleProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [isFavorite, setIsFavorite] = useState(false);
  // const [dominantColor, setDominantColor] = useState("#292B30");
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState(0);

  // Context hooks (uncomment when implementing contexts)
  // const { addToCart } = useContext(CartContext);
  // const { favorites, addToFavorites, removeFromFavorites } = useContext(FavoritesContext);

  const handleGoBack = () => navigate(-1);

  const toggleFavorite = () => {
    setIsFavorite((prev) => !prev);

    // if (isFavorite) {
    //   removeFromFavorites(id as string);
    // } else {
    //   addToFavorites(id as string);
    // }
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
      // Fallback for browsers that don't support share API
      navigator.clipboard.writeText(window.location.href);
      // Show toast or notification that URL was copied
      alert("Link copied to clipboard!");
    }
  };

  useEffect(() => {
    // Fetch product data based on ID
    const fetchProduct = async () => {
      setLoading(true);
      try {
        // const response = await fetch(`/api/products/${id}`);
        // const data = await response.json();

        setTimeout(() => {
          const mockProduct = {
            id,
            name: "Vaseline Cocoa Radiant",
            price: 0.0002,
            discountPrice: 0.00015,
            description: "Product description goes here...",
            rating: 4.7,
            reviewCount: 4,
          };

          setProduct(mockProduct);
          setReviewCount(mockProduct.reviewCount);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error("Failed to fetch product:", error);
        setLoading(false);
      }
    };

    // Check if product is in favorites
    // Uncomment when implementing context

    if (id) {
      fetchProduct();
      // checkFavoriteStatus();
      // Reset to details tab when product changes
      setActiveTab("details");
    }

    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return <ProductLoadingSkeleton />;
  }

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
              <ProductImage productId={id} />
            </div>
          </div>

          <div className="w-full xl:w-7/12">
            <div className="bg-[#292B30] shadow-xl text-white w-full rounded-xl overflow-hidden">
              <div className="px-4 sm:px-8 md:px-12 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    {product?.name}
                  </h1>
                  <div className="flex items-center">
                    {product?.discountPrice ? (
                      <>
                        <span className="text-xl sm:text-2xl font-bold text-Red">
                          {product.discountPrice} ETH
                        </span>
                        <span className="ml-2 text-gray-400 line-through">
                          {product.price}ETH
                        </span>
                      </>
                    ) : (
                      <span className="text-xl sm:text-2xl font-bold">
                        {product?.price}ETH
                      </span>
                    )}
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
                  <ProductDetails />
                ) : (
                  <CustomerReviews />
                )}
              </div>

              <PurchaseSection />
            </div>
          </div>
        </div>
        <div className="mt-8">
          <ProductList
            title="You might also like"
            className="mt-8"
            isCategoryView={false}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default SingleProduct;
