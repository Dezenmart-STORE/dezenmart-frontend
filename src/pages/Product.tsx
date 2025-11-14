import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Container from "../components/common/Container";
import { IoChevronBackOutline, IoSearch } from "react-icons/io5";
import ProductList from "../components/product/ProductList";
import { useSearchProductsQuery } from "../store/api/productsApi";
import { debounce } from "../utils/helpers";
import ProductCard from "../components/product/ProductCard";
import { useSEO } from "../hooks/useSEO";
import { PAGE_SEO, SEO_CONFIG, generateBreadcrumbSchema } from "../utils/seo/seoConfig";

const categories = [
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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const location = useLocation();
  const params = useParams();
  const categoryParam = params.categoryName;

  const [activeCategory, setActiveCategory] = useState(categoryParam || "All");

  // SEO Configuration for product listing/category pages
  const seoConfig = useMemo(() => {
    const isAllCategory = activeCategory === "All";

    if (searchQuery.trim()) {
      // Search results page
      return {
        title: `Search: "${searchQuery}" - Buy with Crypto | DezenMart`,
        description: `Find products matching "${searchQuery}" on DezenMart. Shop securely with cryptocurrency and stablecoins.`,
        keywords: [
          ...PAGE_SEO.products.keywords || [],
          searchQuery,
          `buy ${searchQuery}`,
        ],
        noindex: true, // Don't index search result pages
      };
    }

    if (isAllCategory) {
      // All products page
      return {
        title: PAGE_SEO.products.title,
        description: PAGE_SEO.products.description,
        keywords: PAGE_SEO.products.keywords,
        structuredData: [
          generateBreadcrumbSchema([
            { name: "Home", url: SEO_CONFIG.siteUrl },
            { name: "Products", url: `${SEO_CONFIG.siteUrl}/product` },
          ]),
        ],
      };
    }

    // Category-specific page
    return {
      title: `${activeCategory} - Buy with Crypto | DezenMart`,
      description: `Shop ${activeCategory.toLowerCase()} with cryptocurrency on DezenMart. Secure payments with USDT, cUSD, and 16+ stablecoins. Escrow protection on every order.`,
      keywords: [
        activeCategory.toLowerCase(),
        `buy ${activeCategory.toLowerCase()} with crypto`,
        `${activeCategory.toLowerCase()} cryptocurrency`,
        ...PAGE_SEO.products.keywords || [],
      ],
      structuredData: [
        generateBreadcrumbSchema([
          { name: "Home", url: SEO_CONFIG.siteUrl },
          { name: "Products", url: `${SEO_CONFIG.siteUrl}/product` },
          {
            name: activeCategory,
            url: `${SEO_CONFIG.siteUrl}/product/category/${activeCategory.toLowerCase()}`,
          },
        ]),
      ],
    };
  }, [activeCategory, searchQuery]);

  useSEO(seoConfig);

  // RTK Query hook for search with skip option
  const { data: searchResults = [], isLoading: isSearching } = useSearchProductsQuery(
    debouncedQuery,
    {
      skip: !debouncedQuery.trim(),
    }
  );

  // Debounced search input
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setDebouncedQuery(query);
      }, 300),
    []
  );

  // Update active category based on URL
  useEffect(() => {
    if (categoryParam) {
      const formattedCategory =
        categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
      setActiveCategory(formattedCategory);
    } else {
      setActiveCategory("All");
    }
  }, [categoryParam, location]);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  const handleGoBack = useCallback(() => {
    window.history.back();
  }, []);

  const searchResultsWithNew = useMemo(() => {
    return searchResults
      .map((product) => {
        if (!product) return null;

        const isNew = (() => {
          const createdDate = new Date(product.createdAt);
          const now = new Date();
          const diffInMs = now.getTime() - createdDate.getTime();
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
          return diffInDays < 7;
        })();

        return { product, isNew };
      })
      .filter((item) => item !== null);
  }, [searchResults]);

  const isAllCategory = activeCategory === "All";

  return (
    <div className="bg-Dark min-h-screen">
      <Container>
        {isAllCategory ? (
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
                className="w-full rounded-none bg-[#292B30] outline-none text-white placeholder-gray-400"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>

            {/* Search Results */}
            {searchQuery && (
              <div className="mt-8">
                <div className="text-white text-xl mb-4">
                  {isSearching
                    ? "Searching..."
                    : `Search results for "${searchQuery}"`}
                </div>
                {!isSearching && searchResultsWithNew.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
                    {searchResultsWithNew.map(({ product, isNew }, index) => (
                      <ProductCard
                        key={`search-${product._id}-${index}`}
                        product={product}
                        isNew={isNew}
                      />
                    ))}
                  </div>
                ) : (
                  !isSearching && (
                    <div className="text-gray-400 text-center py-4">
                      No products found matching "{searchQuery}"
                    </div>
                  )
                )}
              </div>
            )}

            {/* Categories */}
            <div className="mt-8 overflow-x-auto scrollbar-hide">
              <div className="flex space-x-4 py-2 min-w-max scrollbar-hide ">
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

            {/* All Products */}
            {!searchQuery && (
              <>
                <ProductList
                  title="Featured Products"
                  className="mt-8"
                  isCategoryView={false}
                  isFeatured={true}
                  showViewAll={false}
                />
                <ProductList
                  title="All Products"
                  className="mt-8"
                  isCategoryView={true}
                  category="All"
                  showViewAll={false}
                />
              </>
            )}
          </>
        ) : (
          <>
            {/* Category Header */}
            <div className="relative mt-8">
              <button
                className="absolute top-1/2 left-0 -translate-y-1/2 text-white p-1.5 rounded-full hover:bg-[#292B30] transition-colors"
                onClick={handleGoBack}
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
              showViewAll={false}
            />
          </>
        )}
      </Container>
    </div>
  );
};

export default Product;
