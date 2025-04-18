import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Container from "../components/common/Container";
import { IoChevronBackOutline, IoSearch } from "react-icons/io5";
import ProductList from "../components/product/ProductList";

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

  // future: Set the active category based on URL or default to "All"
  const [activeCategory, setActiveCategory] = useState(categoryParam || "All");

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
    setSearchQuery(e.target.value);
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
