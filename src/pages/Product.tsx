import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Container from "../components/common/Container";
import { IoChevronBackOutline, IoSearch, IoClose } from "react-icons/io5";
import ProductList from "../components/product/ProductList";
import { useSearchProductsQuery } from "../store/api/productsApi";
import { debounce } from "../utils/helpers";
import ProductCard from "../components/product/ProductCard";
import { useSEO } from "../utils/hooks/useSEO";
import {
  PAGE_SEO,
  SEO_CONFIG,
  generateBreadcrumbSchema,
} from "../utils/seo/seoConfig";

const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Beauty & Personal Care",
  "Sports & Outdoors",
  "Art Work",
  "Accessories",
];

// Returns true if the product was created in the last 7 days
const isRecentProduct = (createdAt: string) =>
  (Date.now() - new Date(createdAt).getTime()) / 86_400_000 < 7;

const ProductSkeletonGrid = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5 md:gap-5">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="bg-[#292B30] rounded-lg overflow-hidden animate-pulse"
      >
        <div className="aspect-square bg-[#1a1c20]" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-[#1a1c20] rounded w-3/4" />
          <div className="h-3 bg-[#1a1c20] rounded w-1/2" />
          <div className="h-4 bg-[#1a1c20] rounded w-1/3 mt-1" />
        </div>
      </div>
    ))}
  </div>
);

const Product = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();
  const params = useParams();
  const categoryParam = params.categoryName;

  const [activeCategory, setActiveCategory] = useState(categoryParam || "All");

  // SEO
  const seoConfig = useMemo(() => {
    const isAllCategory = activeCategory === "All";

    if (searchQuery.trim()) {
      return {
        title: `Search: "${searchQuery}" - Buy with Crypto | DezenMart`,
        description: `Find products matching "${searchQuery}" on DezenMart. Shop securely with cryptocurrency and stablecoins.`,
        keywords: [
          ...(PAGE_SEO.products.keywords || []),
          searchQuery,
          `buy ${searchQuery}`,
        ],
        noindex: true,
      };
    }

    if (isAllCategory) {
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

    return {
      title: `${activeCategory} - Buy with Crypto | DezenMart`,
      description: `Shop ${activeCategory.toLowerCase()} with cryptocurrency on DezenMart. Secure payments with USDT, cUSD, and 16+ stablecoins. Escrow protection on every order.`,
      keywords: [
        activeCategory.toLowerCase(),
        `buy ${activeCategory.toLowerCase()} with crypto`,
        `${activeCategory.toLowerCase()} cryptocurrency`,
        ...(PAGE_SEO.products.keywords || []),
      ],
      structuredData: [
        generateBreadcrumbSchema([
          { name: "Home", url: SEO_CONFIG.siteUrl },
          { name: "Products", url: `${SEO_CONFIG.siteUrl}/product` },
          {
            name: activeCategory,
            url: `${SEO_CONFIG.siteUrl}/product/category/${encodeURIComponent(
              activeCategory.toLowerCase()
            )}`,
          },
        ]),
      ],
    };
  }, [activeCategory, searchQuery]);

  useSEO(seoConfig);

  const { data: searchResults = [], isLoading: isSearching } =
    useSearchProductsQuery(debouncedQuery, {
      skip: !debouncedQuery.trim(),
    });

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setDebouncedQuery(query);
      }, 300),
    []
  );

  // Resolve category name from URL param — handles multi-word categories and encoding
  useEffect(() => {
    if (categoryParam) {
      const decoded = decodeURIComponent(categoryParam);
      const matched = CATEGORIES.find(
        (c) => c.toLowerCase() === decoded.toLowerCase()
      );
      setActiveCategory(matched || decoded);
    } else {
      setActiveCategory("All");
    }
  }, [categoryParam]);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

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
            <div className="flex items-center gap-3 bg-[#292B30] rounded-lg px-4 py-3">
              <IoSearch className="text-white text-xl flex-shrink-0" />
              <input
                type="text"
                placeholder="Search DezenMart"
                className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
                value={searchQuery}
                onChange={handleSearch}
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <IoClose className="text-xl" />
                </button>
              )}
            </div>

            {/* Search results */}
            {searchQuery && (
              <div className="mt-8">
                <p className="text-white text-xl mb-4">
                  {isSearching
                    ? "Searching..."
                    : `Search results for "${searchQuery}"`}
                </p>

                {isSearching ? (
                  <ProductSkeletonGrid />
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5 md:gap-5">
                    {searchResults.map((product, index) => (
                      <ProductCard
                        key={`search-${product._id}-${index}`}
                        product={product}
                        isNew={isRecentProduct(product.createdAt)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">
                    No products found for &ldquo;{searchQuery}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* Category pills */}
            <div className="mt-8 overflow-x-auto scrollbar-hide">
              <div className="flex space-x-3 py-2 min-w-max">
                <Link
                  to="/product"
                  className={`px-4 py-2 rounded-full text-sm transition-colors whitespace-nowrap ${
                    activeCategory === "All"
                      ? "bg-Red text-white"
                      : "bg-[#292B30] text-[#AEAEB2] hover:bg-[#343539]"
                  }`}
                >
                  All
                </Link>
                {CATEGORIES.map((category) => (
                  <Link
                    to={`/product/category/${encodeURIComponent(
                      category.toLowerCase()
                    )}`}
                    key={category}
                    className={`px-4 py-2 rounded-full text-sm transition-colors whitespace-nowrap ${
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

            {/* Product lists — hidden while search is active */}
            {!searchQuery && (
              <>
                <div className="mt-8 bg-[#1a1c20]/50 rounded-lg p-4 md:p-6">
                  <ProductList
                    title="Sponsored"
                    isCategoryView={false}
                    isFeatured={true}
                    maxItems={3}
                    showViewAll={false}
                  />
                </div>

                <ProductList
                  title="All Products"
                  subtitle="Browse our complete collection"
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
            {/* Category header */}
            <div className="relative mt-8">
              <button
                className="absolute top-1/2 left-0 -translate-y-1/2 text-white p-1.5 rounded-full hover:bg-[#292B30] transition-colors"
                onClick={handleGoBack}
                aria-label="Go back"
              >
                <IoChevronBackOutline className="h-6 w-6" />
              </button>

              <h2 className="text-white font-bold text-[34px] px-4 md:px-0 mx-auto text-center">
                {activeCategory}
              </h2>
            </div>

            <ProductList
              title={activeCategory}
              subtitle={`Explore all ${activeCategory.toLowerCase()} products`}
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
