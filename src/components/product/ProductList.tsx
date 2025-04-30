import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import ProductCard from "./ProductCard";
import Title from "../common/Title";
import { Link } from "react-router-dom";
import { useProductData } from "../../utils/hooks/useProductData";
import { Product } from "../../utils/types";

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

  useEffect(() => {
    const loadData = async () => {
      if (isFeatured) {
        await fetchSponsoredProducts();
      } else if (products.length === 0) {
        await fetchAllProducts();
      }
    };

    loadData();
  }, [fetchAllProducts, fetchSponsoredProducts, isFeatured, products.length]);

  useEffect(() => {
    if (isFeatured && sponsoredProducts.length > 0) {
      setDisplayProducts(sponsoredProducts.slice(0, maxItems));
    } else if (products.length > 0) {
      if (category) {
        const filteredProducts = getProductsByCategory(category);
        setDisplayProducts(filteredProducts.slice(0, maxItems));
      } else {
        setDisplayProducts(products.slice(0, maxItems));
      }
    }
  }, [
    products,
    sponsoredProducts,
    isFeatured,
    category,
    maxItems,
    getProductsByCategory,
  ]);

  const newClass = twMerge("", className);

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
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
            {Array.from({ length: maxItems }).map((_, i) => (
              <div
                key={i}
                className="bg-[#292B30] rounded-lg p-4 h-80 animate-pulse"
              >
                <div className="h-40 bg-gray-700/30 rounded-md mb-4"></div>
                <div className="h-5 bg-gray-700/30 rounded-md mb-2 w-3/4"></div>
                <div className="h-4 bg-gray-700/30 rounded-md mb-2 w-1/2"></div>
                <div className="h-4 bg-gray-700/30 rounded-md w-5/6"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-Red text-center py-8">
            Failed to load products. Please try again later.
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
            {displayProducts.map((product, index) => (
              <ProductCard
                key={product._id}
                product={product}
                isNew={index === 0 && isFeatured}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductList;
