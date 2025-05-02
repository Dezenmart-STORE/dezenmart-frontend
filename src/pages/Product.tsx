import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Container from "../components/common/Container";
import { IoChevronBackOutline, IoSearch } from "react-icons/io5";
import ProductList from "../components/product/ProductList";
import { useProductData } from "../utils/hooks/useProductData";
import { debounce } from "../utils/helpers";
import ProductCard from "../components/product/ProductCard";
import LoadingSpinner from "../components/common/LoadingSpinner";

// categories
const categories = [
  // "All",
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Beauty & Personal Care",
  "Sports & Outdoors",
  "Art Work",
  "Accessories",
];

const Product = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const params = useParams();
  const categoryParam = params.categoryName;
  const { searchProducts, searchResults, loading, fetchAllProducts } =
    useProductData();
  const [isLoading, setIsLoading] = useState(loading);
  const [activeCategory, setActiveCategory] = useState(categoryParam || "All");

  const debouncedSearch = debounce(async (query: string) => {
    if (query.trim()) {
      await searchProducts(query);
    }
  }, 300);

  useEffect(() => {
    fetchAllProducts();
    setIsLoading(false);
  }, [fetchAllProducts]);

  useEffect(() => {
    if (categoryParam) {
      const formattedCategory =
        categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
      setActiveCategory(formattedCategory);
    } else {
      setActiveCategory("All");
    }
  }, [categoryParam, location]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  return (
    <div className="bg-Dark min-h-screen">
      <Container>
        {/* Content based on active category */}
        {activeCategory === "All" ? (
          <>
            <h2 className="text-white font-bold text-2xl mb-6">
              Browse Products
            </h2>
            {/* Search Bar */}
            <div className="flex justify-center items-center gap-3 bg-[#292B30] outline-none border-0 rounded-lg px-4 py-3">
              <IoSearch className="text-white text-xl" />
              <input
                type="text"
                placeholder="Search DezenMart"
                className="w-full rounded-none bg-[#292B30] outline-none text-white"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>

            {/* Display search results if there's a query */}
            {searchQuery && (
              <div className="mt-8">
                <div className="text-white text-xl mb-4">
                  {loading
                    ? "Searching..."
                    : `Search results for "${searchQuery}"`}
                </div>
                {!loading && searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
                    {searchResults.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                ) : (
                  !loading && (
                    <div className="text-gray-400 text-center py-4">
                      No products found matching "{searchQuery}"
                    </div>
                  )
                )}
              </div>
            )}
            {/* Categories */}
            <div className="mt-8 overflow-x-auto scrollbar-hide">
              <div className="flex space-x-4 py-2 min-w-max">
                <Link
                  to="/product"
                  className={`px-4 py-2 rounded-full transition-colors whitespace-nowrap ${
                    activeCategory === "All"
                      ? "bg-Red text-white"
                      : "bg-[#292B30] text-[#AEAEB2] hover:bg-[#343539]"
                  }`}
                >
                  All
                </Link>
                {categories.map((category) => (
                  <Link
                    to={`/product/category/${category.toLowerCase()}`}
                    key={`${category}-productbutton`}
                    className={`px-4 py-2 rounded-full transition-colors whitespace-nowrap ${
                      activeCategory === category
                        ? "bg-Red text-white"
                        : "bg-[#292B30] text-[#AEAEB2] hover:bg-[#343539]"
                    }`}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>

            {/* Show all products */}

            <ProductList
              title="All Products"
              className="mt-8"
              isCategoryView={false}
              category="All"
            />
          </>
        ) : (
          <>
            <div className="relative mt-8">
              <button
                className="absolute top-1/2 left-0 -translate-y-1/2 text-white p-1.5 rounded-full hover:bg-[#292B30] transition-colors"
                onClick={() => window.history.back()}
                aria-label="Go back"
              >
                <IoChevronBackOutline className="h-6 w-6 align-middle" />
              </button>

              <h2 className="text-white font-bold text-[34px] px-4 md:px-0 mx-auto align-middle text-center">
                {activeCategory}
              </h2>
            </div>
            <ProductList
              title={activeCategory}
              className="mt-8"
              isCategoryView={true}
              category={activeCategory}
              maxItems={20}
            />
          </>
        )}
      </Container>
    </div>
  );
};

export default Product;
