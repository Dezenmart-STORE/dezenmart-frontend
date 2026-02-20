import { memo, useMemo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AiOutlineHome } from "react-icons/ai";
import { BiPackage } from "react-icons/bi";
import { IoSwapHorizontalOutline } from "react-icons/io5";
import { BsPeople } from "react-icons/bs";
import { RiUser3Line } from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";
import { useGetConversationsQuery } from "../../store/api";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { icon: <AiOutlineHome size={22} />, label: "Home", path: "/" },
  { icon: <BiPackage size={22} />, label: "Product", path: "/product" },
  {
    icon: <IoSwapHorizontalOutline size={22} />,
    label: "Trade",
    path: "/trades",
  },
  // {
  //   icon: <IoChatbubbleOutline size={22} />,
  //   label: "Chat",
  //   path: "/chat",
  //   badgeKey: "totalUnreadMessages",
  // },
  { icon: <BsPeople size={22} />, label: "Community", path: "/community" },
  { icon: <RiUser3Line size={22} />, label: "Account", path: "/account" },
];

const MobileNavigation = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);

  // RTK Query hook - polling for real-time updates, only when authenticated
  const { data: conversations = [] } = useGetConversationsQuery(undefined, {
    pollingInterval: 30000,
    skip: !isAuthenticated,
  });

  const totalUnreadMessages = useMemo(
    () => conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0),
    [conversations]
  );

  // Update active index based on current path
  useEffect(() => {
    const pathname = location.pathname;

    // Check for exact match first
    let currentIndex = navItems.findIndex((item) => item.path === pathname);

    // If no exact match, check for special routes
    if (currentIndex === -1) {
      // Handle product routes: /product/:id, /products, /product
      if (pathname.startsWith('/product')) {
        currentIndex = navItems.findIndex((item) => item.path === '/product');
      }
      // Handle order routes: /orders/:id
      else if (pathname.startsWith('/orders/')) {
        currentIndex = navItems.findIndex((item) => item.path === '/product');
      }
    }

    // Only set active index if we found a match
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    } else {
      // If no match found, set to -1 to not highlight any nav item
      setActiveIndex(-1);
    }
  }, [location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#212428]/95 backdrop-blur-lg flex justify-evenly items-center px-2 py-2 md:hidden z-50 border-t border-[#292B30] shadow-2xl">
      {/* Active indicator - only show if activeIndex is valid */}
      {activeIndex >= 0 && (
        <motion.div
          className="absolute top-0 h-0.5 bg-gradient-to-r from-transparent via-Red to-transparent"
          initial={false}
          animate={{
            left: `${(activeIndex / navItems.length) * 100}%`,
            width: `${100 / navItems.length}%`,
          }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30,
          }}
        />
      )}

      {navItems.map((item, index) => {
        const isActive = index === activeIndex;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className="relative flex flex-col items-center"
            aria-label={item.label}
          >
            {({ isActive: linkActive }) => (
              <motion.div
                className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors"
                whileTap={{ scale: 0.9 }}
                animate={{
                  backgroundColor: linkActive ? "rgba(239, 68, 68, 0.1)" : "transparent",
                }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon with scale animation */}
                <motion.div
                  animate={{
                    scale: linkActive ? 1.1 : 1,
                    color: linkActive ? "#ef4444" : "#545456",
                  }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  {item.icon}

                  {/* Active dot indicator */}
                  <AnimatePresence>
                    {linkActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-1 -right-1 w-2 h-2 bg-Red rounded-full"
                      />
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Label */}
                <motion.span
                  className="text-[10px] font-medium"
                  animate={{
                    color: linkActive ? "#ef4444" : "#545456",
                    fontWeight: linkActive ? 600 : 500,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                </motion.span>
              </motion.div>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default memo(MobileNavigation);
