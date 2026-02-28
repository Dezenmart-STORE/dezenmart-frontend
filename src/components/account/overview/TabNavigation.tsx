import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TabNavigationProps } from "../../../utils/types";

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  options,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const container = containerRef.current;
    const activeEl = tabRefs.current[activeTab];
    if (!container || !activeEl) return;
    const { left, width } = activeEl.getBoundingClientRect();
    const { left: cLeft, width: cWidth } = container.getBoundingClientRect();
    container.scrollTo({
      left: container.scrollLeft + left - cLeft - cWidth / 2 + width / 2,
      behavior: "smooth",
    });
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className="flex gap-1 overflow-x-auto scrollbar-hide bg-[#292B30] rounded-xl p-1 mt-4"
    >
      {options.map(({ id, label }) => (
        <button
          key={id}
          ref={(el) => void (tabRefs.current[id] = el)}
          onClick={() => onTabChange(id)}
          className="relative flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap z-10 transition-colors"
          style={{ color: activeTab === id ? "#fff" : "#9ca3af" }}
        >
          {activeTab === id && (
            <motion.div
              className="absolute inset-0 bg-red-600 rounded-lg"
              layoutId="activeTab"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <span className="relative z-10">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
