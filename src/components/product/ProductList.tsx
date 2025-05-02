import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import ProductCard from "./ProductCard";
import Title from "../common/Title";
import { Link } from "react-router-dom";
import { useProductData } from "../../utils/hooks/useProductData";
import { Product } from "../../utils/types";
import LoadingSpinner from "../common/LoadingSpinner";

interface Props {
  title: string;
  path?: string;
  className?: string;
  isCategoryView: boolean;
  category?: string;
  isFeatured?: boolean;
  maxItems?: number;
}

const ProductList = ({
  title,
  path,
  className,
  isCategoryView,
  category,
  isFeatured = false,
  maxItems = 4,
}: Props) => {
  const {
    products,
    sponsoredProducts,
    loading,
    error,
    fetchAllProducts,
    fetchSponsoredProducts,
    getProductsByCategory,
  } = useProductData();

  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        if (isFeatured) {
          await fetchSponsoredProducts(false, false, true);
        } else {
          await fetchAllProducts(false, false, true);
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          setLoadError("Request was cancelled");
        } else {
          setLoadError("Failed to load products. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isFeatured, fetchAllProducts, fetchSponsoredProducts]);

  useEffect(() => {
    if (!loading) {
      if (isFeatured && sponsoredProducts && sponsoredProducts.length > 0) {
        setDisplayProducts(sponsoredProducts.slice(0, maxItems));
      } else if (products && products.length > 0) {
        if (category) {
          const filteredProducts = getProductsByCategory(category);
          setDisplayProducts(
            filteredProducts.slice(
              0,
              isCategoryView || category === "All"
                ? filteredProducts.length
                : maxItems
            )
          );
        } else {
          setDisplayProducts(products.slice(0, maxItems));
        }
      } else {
        setDisplayProducts([]);
      }
    }
  }, [
    category,
    getProductsByCategory,
    isFeatured,
    maxItems,
    products,
    sponsoredProducts,
    isCategoryView,
    loading,
  ]);

  const newClass = twMerge("", className);

  if (
    !isCategoryView &&
    !isLoading &&
    !loadError &&
    displayProducts.length === 0
  ) {
    return <></>;
  }

  return (
    <section className={newClass}>
      {!isCategoryView && (
        <div className="flex items-center justify-between px-4 md:px-0">
          <Title text={title} className="text-white text-lg md:text-2xl" />
          {path && (
            <Link
              to={path}
              className="text-sm md:text-base text-white hover:text-Red transition-colors"
            >
              View all
            </Link>
          )}
        </div>
      )}
      <div className="mt-4 md:mt-8 overflow-x-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : loadError || error ? (
          <div className="text-Red text-center py-8">
            {loadError ||
              error ||
              "Failed to load products. Please try again later."}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No products found{category ? ` in ${category}` : ""}.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
            {displayProducts.map((product) => {
              const isNew = (() => {
                const createdDate = new Date(product.createdAt);
                const now = new Date();
                const diffInMs = now.getTime() - createdDate.getTime();
                const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
                return diffInDays < 7;
              })();

              return (
                <ProductCard
                  key={product._id}
                  product={product}
                  isNew={isNew}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductList;
