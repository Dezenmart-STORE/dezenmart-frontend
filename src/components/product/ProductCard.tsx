import React from "react";
import { FaRegHeart } from "react-icons/fa";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { BsCart3 } from "react-icons/bs";
import { Product } from "../../utils/types";

interface ProductCardProps {
  product: Product;
  isNew?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL;

const ProductCard = React.memo(
  ({ product, isNew = false }: ProductCardProps) => {
    const navigate = useNavigate();
    const { _id, name, description, price, images, seller } = product;

    const ethPrice = (price / 1000000).toFixed(6);

    const imageUrl =
      images && images.length > 0
        ? `${API_URL}/uploads/${images[0]}`
        : "https://placehold.co/300x300?text=No+Image";

    // const sellerName =
    //   typeof seller === "object" && seller !== null
    //     ? seller?.name || "Unknown Seller"
    //     : seller || "Unknown Seller";

    return (
      <Link
        to={`/product/${_id}`}
        className="bg-[#292B30] rounded-lg relative flex flex-col justify-center items-center overflow-hidden group h-full"
      >
        <div className="mb-2 md:mb-10 w-full flex justify-between p-2 md:p-4">
          {isNew && (
            <div className="text-white text-xs md:text-sm bg-Red/20 rounded-xl py-1 px-2">
              New
            </div>
          )}
          <button
            className="ml-auto"
            aria-label="Add to favorites"
            onClick={(e) => {
              e.preventDefault();
              // Add wishlist logic
            }}
          >
            <FaRegHeart className="text-xl md:text-2xl text-white hover:text-Red transition-colors" />
          </button>
        </div>

        <img
          src={imageUrl}
          alt={name}
          className="py-2 md:py-4 w-[60%] md:w-[70%] object-contain"
          loading="lazy"
        />

        <div className="flex flex-col w-full p-3 md:p-6">
          <h4 className="text-white text-base md:text-lg font-bold truncate">
            {name}
          </h4>
          <h4 className="flex items-center gap-1 text-xs md:text-sm text-[#AEAEB2] py-1">
            By {typeof seller === "string" ? seller : "Unknown Seller"}
            <RiVerifiedBadgeFill className="text-[#4FA3FF] text-xs" />
          </h4>
          <h4 className="text-white text-xs md:text-sm py-0 line-clamp-1">
            {description}
          </h4>
          <h4 className="text-[#AEAEB2] text-xs md:text-sm py-1 md:py-3 group-hover:hidden">
            {images.length} items {ethPrice} ETH
          </h4>
          <button
            className="mt-[5px] gap-3 lg:gap-7 font-bold text-white bg-Red py-2 hidden group-hover:flex justify-center items-center w-full transition-all duration-300"
            onClick={() => navigate(`/product/${_id}`)}
          >
            <div>Buy Now</div>
            <BsCart3 className="font-bold text-xl" />
          </button>
        </div>
      </Link>
    );
  }
);

export default ProductCard;
