import { useEffect, useState, useMemo, useCallback } from "react";
import { twMerge } from "tailwind-merge";
import ProductCard from "./ProductCard";
import Title from "../common/Title";
import { Link } from "react-router-dom";
import {
  useGetProductsQuery,
  useGetSponsoredProductsQuery,
  useGetProductsByCategoryQuery,
  useGetProductsBySellerQuery,
} from "../../store/api";
import { Product } from "../../utils/types";
import LoadingSpinner from "../common/LoadingSpinner";
import { useIntersectionObserver } from "../../utils/hooks/useIntersectionObserver";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "../account/overview/EmptyState";

interface Props {
  title: string;
  path?: string;
  className?: string;
  isCategoryView: boolean;
  isUserProducts?: boolean;
  category?: string;
  isFeatured?: boolean;
  maxItems?: number;
  showViewAll?: boolean;
}

const ITEMS_PER_PAGE = 12;

const ProductList = ({
  title,
  path,
  className,
  isCategoryView,
  category,
  isFeatured = false,
  maxItems,
  showViewAll = true,
  isUserProducts = false,
}: Props) => {
  const { user } = useAuth();

  // Determine which query to use based on props
  const shouldFetchAll = !isFeatured && !category && !isUserProducts;
  const shouldFetchCategory = !!category && category !== "All";
  const shouldFetchSponsored = isFeatured || !!category || isUserProducts;
  const shouldFetchUser = isUserProducts && !!user?._id;

  // RTK Query hooks - conditional fetching
  const {
    data: allProducts = [],
    isLoading: loadingAll,
    isFetching: fetchingAll,
  } = useGetProductsQuery(undefined, {
    skip: !shouldFetchAll && category !== "All",
  });

  const {
    data: sponsoredProducts = [],
    isLoading: loadingSponsored,
  } = useGetSponsoredProductsQuery(undefined, {
    skip: !shouldFetchSponsored,
  });

  const {
    data: categoryProducts = [],
    isLoading: loadingCategory,
  } = useGetProductsByCategoryQuery(category!, {
    skip: !shouldFetchCategory,
  });

  const {
    data: userProducts = [],
    isLoading: loadingUser,
  } = useGetProductsBySellerQuery(user?._id!, {
    skip: !shouldFetchUser,
  });

  // State for pagination
  const [displayedCount, setDisplayedCount] = useState(maxItems || ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Intersection observer for infinite scroll with increased root margin for earlier loading
  const { targetRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "400px", // Load content earlier for smoother scrolling
  });

  // Helper function to check if product belongs to current user
  const isUserProduct = (product: Product): boolean => {
    if (!user || !product) return false;
    if (typeof product.seller === "object" && product.seller) {
      return product.seller._id === user._id;
    }
    return product.seller === user._id;
  };

  // Compute final product lists
  const { regularProducts, sponsoredList } = useMemo(() => {
    let sponsored: Product[] = [];
    let regular: Product[] = [];

    if (isFeatured) {
      // Featured view: only show sponsored products
      regular = sponsoredProducts || [];
      // Filter out user's own products if not in user products view
      if (!isUserProducts && user) {
        regular = regular.filter((p) => !isUserProduct(p));
      }
    } else if (category === "All") {
      // All products view
      sponsored = sponsoredProducts || [];
      const sponsoredIds = new Set(sponsored.map((p) => p._id));
      regular = (allProducts || []).filter((p) => !sponsoredIds.has(p._id));

      // Filter out user's own products from public view
      if (!isUserProducts && user) {
        sponsored = sponsored.filter((p) => !isUserProduct(p));
        regular = regular.filter((p) => !isUserProduct(p));
      }
    } else if (category && category !== "All") {
      // Specific category view
      sponsored = (sponsoredProducts || []).filter(
        (p) => p.category?.toLowerCase() === category.toLowerCase()
      );
      const sponsoredIds = new Set(sponsored.map((p) => p._id));
      regular = (categoryProducts || []).filter((p) => !sponsoredIds.has(p._id));

      // Filter out user's own products from public category view
      if (!isUserProducts && user) {
        sponsored = sponsored.filter((p) => !isUserProduct(p));
        regular = regular.filter((p) => !isUserProduct(p));
      }
    } else if (isUserProducts) {
      // User products view - ONLY show user's own products
      sponsored = (sponsoredProducts || []).filter((product) => {
        if (!product || !user) return false;
        if (typeof product.seller === "object" && product.seller) {
          return product.seller._id === user._id;
        }
        return product.seller === user._id;
      });
      const sponsoredIds = new Set(sponsored.map((p) => p._id));
      regular = (userProducts || []).filter((p) => !sponsoredIds.has(p._id));
    } else {
      // Default: all products
      sponsored = sponsoredProducts || [];
      const sponsoredIds = new Set(sponsored.map((p) => p._id));
      regular = (allProducts || []).filter((p) => !sponsoredIds.has(p._id));

      // Filter out user's own products from default view
      if (!isUserProducts && user) {
        sponsored = sponsored.filter((p) => !isUserProduct(p));
        regular = regular.filter((p) => !isUserProduct(p));
      }
    }

    return {
      regularProducts: regular,
      sponsoredList: sponsored,
    };
  }, [
    allProducts,
    sponsoredProducts,
    categoryProducts,
    userProducts,
    category,
    isFeatured,
    isUserProducts,
    user,
  ]);

  // Loading states
  const isInitialLoading = loadingAll || loadingSponsored || loadingCategory || loadingUser;
  const totalProducts = regularProducts.length;
  const hasMore = displayedCount < totalProducts;

  // Reset displayed count when products change
  useEffect(() => {
    setDisplayedCount(maxItems || ITEMS_PER_PAGE);
  }, [category, isFeatured, isUserProducts, maxItems]);

  // Load more handler - optimized for instant loading
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isInitialLoading) return;

    setIsLoadingMore(true);

    // Minimal delay for smooth transition
    await new Promise((resolve) => setTimeout(resolve, 50));

    setDisplayedCount((prev) => Math.min(prev + ITEMS_PER_PAGE, totalProducts));
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, isInitialLoading, totalProducts]);

  // Trigger load more on intersection
  useEffect(() => {
    if (isIntersecting && !isLoadingMore && hasMore && !isInitialLoading) {
      loadMore();
    }
  }, [isIntersecting, loadMore, isLoadingMore, hasMore, isInitialLoading]);

  // Helper to check if product is new
  const isNewProduct = useCallback((createdAt: string) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffInMs = now.getTime() - createdDate.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    return diffInDays < 7;
  }, []);

  // Get products to display
  const productsToDisplay = regularProducts.slice(0, displayedCount);

  // Early return if no products and not in category view
  if (
    !isCategoryView &&
    !isInitialLoading &&
    productsToDisplay.length === 0 &&
    sponsoredList.length === 0
  ) {
    return null;
  }

  const newClass = twMerge("", className);
  const totalDisplayed = productsToDisplay.length + sponsoredList.length;

  return (
    <section className={newClass}>
      {/* Header */}
      {!isCategoryView && (
        <div className="flex items-center justify-between px-4 md:px-0">
          <Title text={title} className="text-white text-lg md:text-2xl" />
          {path && showViewAll && (
            <Link
              to={path}
              className="text-sm md:text-base text-white hover:text-Red transition-colors"
            >
              View all
            </Link>
          )}
        </div>
      )}

      <div className="mt-4 md:mt-8">
        {/* Loading state */}
        {isInitialLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : totalDisplayed === 0 ? (
          isUserProducts ? (
            <EmptyState
              message="You haven't created any products yet."
              buttonText="Create Product"
              buttonPath="/account?tab=5&action=create"
            />
          ) : (
            <div className="text-gray-400 text-center py-8">
              No products found{category && category !== "All" ? ` in ${category}` : ""}.
            </div>
          )
        ) : (
          <>
            {/* Sponsored products section */}
            {(isCategoryView || isUserProducts) && sponsoredList.length > 0 && (
              <div className="mb-8">
                <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-Green text-sm bg-Green/10 px-2 py-1 rounded border border-Green/20">
                    Sponsored
                  </span>
                  {!isUserProducts && category && category !== "All" && `Featured in ${category}`}
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
                  {sponsoredList.map((product) => (
                    <ProductCard
                      key={`sponsored-${product._id}`}
                      product={product}
                      isNew={isNewProduct(product.createdAt)}
                      hideFavorite={isUserProducts}
                    />
                  ))}
                </div>

                {/* Divider */}
                {productsToDisplay.length > 0 && (
                  <>
                    <div className="border-t border-gray-700 my-8"></div>
                    <h3 className="text-white text-lg font-semibold mb-4">
                      {category && category !== "All" ? `All ${category} Products` : "All Products"}
                    </h3>
                  </>
                )}
              </div>
            )}

            {/* Main products grid */}
            {productsToDisplay.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
                {productsToDisplay.map((product, index) => (
                  <ProductCard
                    key={`${product._id}-${index}`}
                    product={product}
                    isNew={isNewProduct(product.createdAt)}
                    hideFavorite={isUserProducts}
                  />
                ))}
              </div>
            )}

            {/* Loading more indicator - Skeleton cards for seamless UX */}
            {isLoadingMore && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5 mt-5">
                {Array.from({ length: Math.min(ITEMS_PER_PAGE, totalProducts - displayedCount) }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="bg-Dark rounded-lg overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-700"></div>
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Intersection observer target */}
            {hasMore && !isLoadingMore && (
              <div ref={targetRef} className="h-10 w-full" aria-hidden="true" />
            )}

            {/* End of results indicator */}
            {!hasMore && totalDisplayed > ITEMS_PER_PAGE && (
              <div className="text-center py-8 text-gray-400">
                <div className="inline-flex items-center gap-2">
                  <div className="h-px bg-gray-600 w-8"></div>
                  <span className="text-sm">
                    You've seen all {totalDisplayed} product{totalDisplayed !== 1 ? "s" : ""}
                  </span>
                  <div className="h-px bg-gray-600 w-8"></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ProductList;
