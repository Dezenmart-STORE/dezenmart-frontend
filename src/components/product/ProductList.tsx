import { twMerge } from "tailwind-merge";
import ProductCard from "./ProductCard";
import Title from "../common/Title";
import { Link } from "react-router-dom";
import { Product1 } from "../../pages";

interface Props {
  title: string;
  path?: string;
  className?: string;
  isCategoryView: boolean;
}

const ProductList = ({ title, path, className, isCategoryView }: Props) => {
  const newClass = twMerge("", className);

  const products = Array(4)
    .fill(null)
    .map((_, index) => ({
      id: index + 1,
      image: Product1,
      title: "Vaseline Lotion",
      seller: "DanBike",
      isVerified: true,
      description: "This non-greasy body lotion",
      price: "0.0002 ETH",
      quantity: 300,
      isNew: index === 0,
    }));

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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductList;
