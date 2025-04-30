import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Container from "../components/common/Container";
import { IoChevronBackOutline, IoSearch } from "react-icons/io5";
import ProductList from "../components/product/ProductList";
import { useProductData } from "../utils/hooks/useProductData";
import { debounce } from "../utils/helpers";
import ProductCard from "../components/product/ProductCard";

// categories
const categories = [
  "All",
  "Clothing",
  "Cosmetics",
  "Electronics",
  "Home",
  "Accessories",
];

const Product = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const params = useParams();
  const categoryParam = params.categoryName;
  const { searchProducts, searchResults, loading } = useProductData();

  const [activeCategory, setActiveCategory] = useState(categoryParam || "All");
  const debouncedSearch = debounce(async (query: string) => {
    if (query.trim()) {
      await searchProducts(query);
    }
  }, 300);

  // Update active category when URL changes
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
                {categories.map((category) => (
                  <Link
                    to={
                      category === "All"
                        ? "/product"
                        : `/product/category/${category.toLowerCase()}`
                    }
                    key={category}
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

            <ProductList
              title="Clothing"
              path="/product/category/clothing"
              className="mt-8"
              isCategoryView={false}
            />
            <ProductList
              title="Cosmetics"
              path="/product/category/cosmetics"
              className="mt-16"
              isCategoryView={false}
            />
            <ProductList
              title="Electronics"
              path="/product/category/electronics"
              className="mt-16"
              isCategoryView={false}
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

              <h2 className="text-white font-bold text-[34px]  px-4 md:px-0 mx-auto align-middle text-center">
                {activeCategory}
              </h2>
            </div>
            <ProductList
              title={activeCategory}
              path={`/product/category/${activeCategory.toLowerCase()}`}
              className="mt-8"
              isCategoryView={true}
            />
          </>
        )}
      </Container>
    </div>
  );
};

export default Product;
