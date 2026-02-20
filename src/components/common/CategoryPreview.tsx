import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CategoryIcons } from "./CategoryIcons";

const CATEGORY_CONFIG = [
  {
    name: "Electronics",
    Icon: CategoryIcons.Electronics,
    gradient: "from-blue-600/20 via-blue-500/10 to-transparent",
    hoverGradient: "from-blue-600/30 via-blue-500/20 to-blue-400/10",
    iconColor: "text-blue-400",
    glowColor: "shadow-blue-500/20",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]",
  },
  {
    name: "Clothing",
    Icon: CategoryIcons.Clothing,
    gradient: "from-purple-600/20 via-purple-500/10 to-transparent",
    hoverGradient: "from-purple-600/30 via-purple-500/20 to-purple-400/10",
    iconColor: "text-purple-400",
    glowColor: "shadow-purple-500/20",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]",
  },
  {
    name: "Home & Garden",
    Icon: CategoryIcons["Home & Garden"],
    gradient: "from-green-600/20 via-green-500/10 to-transparent",
    hoverGradient: "from-green-600/30 via-green-500/20 to-green-400/10",
    iconColor: "text-green-400",
    glowColor: "shadow-green-500/20",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]",
  },
  {
    name: "Beauty & Personal Care",
    Icon: CategoryIcons["Beauty & Personal Care"],
    gradient: "from-pink-600/20 via-pink-500/10 to-transparent",
    hoverGradient: "from-pink-600/30 via-pink-500/20 to-pink-400/10",
    iconColor: "text-pink-400",
    glowColor: "shadow-pink-500/20",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]",
  },
  {
    name: "Sports & Outdoors",
    Icon: CategoryIcons["Sports & Outdoors"],
    gradient: "from-orange-600/20 via-orange-500/10 to-transparent",
    hoverGradient: "from-orange-600/30 via-orange-500/20 to-orange-400/10",
    iconColor: "text-orange-400",
    glowColor: "shadow-orange-500/20",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]",
  },
  {
    name: "Art Work",
    Icon: CategoryIcons["Art Work"],
    gradient: "from-yellow-600/20 via-yellow-500/10 to-transparent",
    hoverGradient: "from-yellow-600/30 via-yellow-500/20 to-yellow-400/10",
    iconColor: "text-yellow-400",
    glowColor: "shadow-yellow-500/20",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]",
  },
  {
    name: "Accessories",
    Icon: CategoryIcons.Accessories,
    gradient: "from-red-600/20 via-red-500/10 to-transparent",
    hoverGradient: "from-red-600/30 via-red-500/20 to-red-400/10",
    iconColor: "text-red-400",
    glowColor: "shadow-red-500/20",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]",
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
    <section className={`my-12 md:my-16 ${className}`}>
      {/* Premium Header */}
      <div className="text-center mb-8 md:mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-white text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            {title}
          </h2>
          {subtitle && (
            <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Decorative line */}
        <motion.div
          className="w-20 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto mt-4"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>

      {/* Premium Category Grid */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-4 md:gap-5">
        {CATEGORY_CONFIG.map((category, index) => {
          const { Icon } = category;
          return (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Link
                to={`/product/category/${category.name.toLowerCase()}`}
                className="group block"
              >
                <motion.div
                  className={`
                    relative overflow-hidden
                    bg-gradient-to-br ${category.gradient}
                    rounded-2xl p-5 md:p-7
                    text-center
                    border border-gray-800/50
                    backdrop-blur-sm
                    transition-all duration-500
                    ${category.borderGlow}
                    hover:border-gray-700/50
                  `}
                  whileHover={{
                    scale: 1.08,
                    y: -8,
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* Background glow effect */}
                  <div
                    className={`
                      absolute inset-0
                      bg-gradient-to-br ${category.hoverGradient}
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-500
                    `}
                  />

                  {/* Animated border gradient */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-transparent" />
                  </div>

                  {/* Icon container with glow */}
                  <motion.div
                    className="relative z-10 mb-3 md:mb-4"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.6 }}
                  >
                    <div
                      className={`
                        inline-flex items-center justify-center
                        w-14 h-14 md:w-16 md:h-16
                        rounded-xl
                        bg-gradient-to-br from-gray-800/50 to-gray-900/50
                        group-hover:from-gray-800/80 group-hover:to-gray-900/80
                        border border-gray-700/50 group-hover:border-gray-600/50
                        transition-all duration-500
                        ${category.glowColor}
                        group-hover:shadow-lg
                      `}
                    >
                      <Icon
                        className={`
                          w-7 h-7 md:w-9 md:h-9
                          ${category.iconColor}
                          transition-all duration-500
                          group-hover:scale-110
                          drop-shadow-[0_0_8px_currentColor]
                        `}
                      />
                    </div>
                  </motion.div>

                  {/* Category name */}
                  <div className="relative z-10">
                    <span
                      className={`
                        text-white text-xs md:text-sm font-semibold
                        block leading-tight
                        transition-all duration-300
                        group-hover:${category.iconColor}
                        group-hover:text-shadow-sm
                      `}
                    >
                      {category.name}
                    </span>
                  </div>

                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom decoration */}
      <motion.div
        className="mt-8 flex items-center justify-center gap-2"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </section>
  );
};

export default CategoryPreview;
