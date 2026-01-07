import { Link } from "react-router-dom";

const CATEGORY_CONFIG = [
  {
    name: "Electronics",
    icon: "📱",
    gradient: "from-blue-500/10 to-transparent",
    hoverGradient: "from-blue-500/20",
  },
  {
    name: "Clothing",
    icon: "👕",
    gradient: "from-purple-500/10 to-transparent",
    hoverGradient: "from-purple-500/20",
  },
  {
    name: "Home & Garden",
    icon: "🏡",
    gradient: "from-green-500/10 to-transparent",
    hoverGradient: "from-green-500/20",
  },
  {
    name: "Beauty & Personal Care",
    icon: "💄",
    gradient: "from-pink-500/10 to-transparent",
    hoverGradient: "from-pink-500/20",
  },
  {
    name: "Sports & Outdoors",
    icon: "⚽",
    gradient: "from-orange-500/10 to-transparent",
    hoverGradient: "from-orange-500/20",
  },
  {
    name: "Art Work",
    icon: "🎨",
    gradient: "from-yellow-500/10 to-transparent",
    hoverGradient: "from-yellow-500/20",
  },
  {
    name: "Accessories",
    icon: "👜",
    gradient: "from-red-500/10 to-transparent",
    hoverGradient: "from-red-500/20",
  },
];

interface Props {
  title?: string;
  subtitle?: string;
  className?: string;
}

const CategoryPreview = ({
  title = "Shop by Category",
  subtitle,
  className = "",
}: Props) => {
  return (
    <section className={`my-12 ${className}`}>
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-white text-2xl md:text-3xl font-bold mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-gray-400 text-sm md:text-base">{subtitle}</p>
        )}
      </div>

      {/* Desktop: 7 columns, Mobile: 3 columns */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-3 md:gap-4">
        {CATEGORY_CONFIG.map((category) => (
          <Link
            key={category.name}
            to={`/product/category/${category.name.toLowerCase()}`}
            className="group"
          >
            <div
              className={`bg-gradient-to-br ${category.gradient} hover:${category.hoverGradient} rounded-xl p-4 md:p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg border border-gray-800 hover:border-gray-700`}
            >
              <div className="text-4xl md:text-5xl mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-300">
                {category.icon}
              </div>
              <span className="text-white text-xs md:text-sm font-medium block leading-tight">
                {category.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryPreview;
