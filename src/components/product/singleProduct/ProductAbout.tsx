import { useState, useEffect } from "react";
import { MdVerified } from "react-icons/md";
import { FaStore } from "react-icons/fa";
import { BiLinkExternal } from "react-icons/bi";

const ProductAbout = () => {
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    // future: API call
    const timer = setTimeout(() => {
      setProduct({
        name: "Vaseline Lotion",
        seller: "DanBike",
        verified: true,
        price: "0.0002 ETH",
        category: "Health & Beauty",
        sold: 125,
        inStock: true,
        storeUrl: "#",
      });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 sm:h-10 w-full bg-gray-700/30 animate-pulse rounded"></div>
        <div className="h-5 sm:h-6 w-2/3 bg-gray-700/30 animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-xl text-white font-medium">
          {product.name}
        </h2>
        <span className="text-base sm:text-xl text-white font-medium">
          {product.price}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <FaStore className="text-gray-400 h-3.5 w-3.5" />
          <span className="text-xs sm:text-sm text-white/70">
            By{" "}
            <a
              href={product.storeUrl}
              className="hover:text-Red transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {product.seller} <BiLinkExternal className="inline h-3 w-3" />
            </a>
          </span>
          {product.verified && (
            <MdVerified className="text-blue-500 h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs sm:text-sm text-white/70">
            <span className="text-white">{product.sold}</span> sold
          </div>

          <div className="text-xs sm:text-sm">
            <span className={product.inStock ? "text-green-500" : "text-Red"}>
              {product.inStock ? "In Stock" : "Out of Stock"}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-1">
        <span className="text-xs sm:text-sm bg-[#1a1b1f] text-gray-400 px-2 py-1 rounded">
          {product.category}
        </span>
      </div>
    </div>
  );
};

export default ProductAbout;
