import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  RiHeartLine,
  RiGiftLine,
  RiShoppingBag3Line,
  RiAlertLine,
  RiStoreLine,
} from "react-icons/ri";
import { TabNavigationProps } from "../../../utils/types";

const TAB_META: Record<string, { icon: React.ReactNode; short: string }> = {
  "1": { icon: <RiHeartLine size={15} />,       short: "Saved"    },
  "2": { icon: <RiGiftLine size={15} />,         short: "Rewards"  },
  "3": { icon: <RiShoppingBag3Line size={15} />, short: "Orders"   },
  "4": { icon: <RiAlertLine size={15} />,        short: "Disputes" },
  "5": { icon: <RiStoreLine size={15} />,        short: "Products" },
};

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
    <div className="sticky top-0 z-20 -mx-4 bg-[#212428] pt-2 pb-1 mt-4">
      {/* Wrapper clips the nav and carries the scroll-fade gradient */}
      <div className="relative px-4">
        <nav
          ref={containerRef}
          aria-label="Account tabs"
          className="flex overflow-x-auto scrollbar-hide bg-[#292B30] rounded-xl p-1 gap-1"
        >
          {options.map(({ id, label }) => {
            const meta = TAB_META[id];
            const isActive = activeTab === id;

            return (
              <button
                key={id}
                ref={(el) => void (tabRefs.current[id] = el)}
                onClick={() => onTabChange(id)}
                aria-selected={isActive}
                role="tab"
                className={`
                  relative flex-1 min-w-[64px]
                  flex items-center justify-center gap-1.5
                  px-2 py-2 rounded-lg text-xs font-medium
                  whitespace-nowrap transition-colors select-none
                  ${isActive ? "text-white" : "text-gray-400 hover:text-gray-200"}
                `}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-red-600 rounded-lg"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {meta?.icon ?? null}
                  <span>{meta?.short ?? label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right-edge fade — hints that the strip is scrollable on small screens */}
        <div className="pointer-events-none absolute right-4 top-0 bottom-0 w-8 rounded-r-xl bg-gradient-to-l from-[#212428] to-transparent" />
      </div>
    </div>
  );
};

export default TabNavigation;
