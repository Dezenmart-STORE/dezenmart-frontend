import { motion } from "framer-motion";
import { TabNavigationProps } from "../../utils/types";

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  options,
}) => {
  return (
    <motion.div
      className="flex bg-[#292B30] items-center gap-4 md:gap-8 mt-20 md:mt-40 p-2 w-fit max-xs:w-full overflow-x-auto scrollbar-hide rounded"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      {options.map(({ id, label }) => (
        <div key={id} className="relative">
          <button
            className={`text-white rounded-lg px-4 py-2 font-bold whitespace-nowrap relative z-10`}
            onClick={() => onTabChange(id)}
          >
            {label}
          </button>
          {activeTab === id && (
            <motion.div
              className="absolute inset-0 bg-Red rounded-lg"
              layoutId="activeTab"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ zIndex: 0 }}
            />
          )}
        </div>
      ))}
    </motion.div>
  );
};

export default TabNavigation;
