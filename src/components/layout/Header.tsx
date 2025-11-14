import {
  useState,
  useRef,
  useEffect,
  useCallback,
  startTransition,
} from "react";
import { HiOutlineBell } from "react-icons/hi";
import { BiLogIn, BiWallet } from "react-icons/bi";
import { FullLogo, Logo } from "../../pages";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Container from "../common/Container";
import {
  useGetUnreadNotificationCountQuery,
  useGetConversationsQuery,
  useGetUserProfileQuery,
  useGetSelfVerificationStatusQuery,
} from "../../store/api";
import NotificationBadge from "../notifications/NotificationBadge";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import CurrencyToggle from "../common/CurrencyToggle";
import WalletConnectButton from "../web3/WalletConnectButton";
import TokenSelector from "./TokenSelector";
import { useWeb3 } from "../../context/Web3Context";
import { FiInfo } from "react-icons/fi";
import { HiAcademicCap } from "react-icons/hi2";
import SefldVerification from "../common/SefldVerification";
import WalkthroughTrigger from "../walkthrough/WalkthroughTrigger";
import { useWalkthrough } from "../../context/WalkthroughContext";

const NavList = [
  { title: "Home", path: "/" },
  { title: "Product", path: "/product" },
  { title: "Trade", path: "/trades" },
  { title: "Community", path: "/community" },
] as const;

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: selectedUser } = useGetUserProfileQuery(undefined, {
    skip: !isAuthenticated, // Skip when not logged in
  });
  const { wallet, disconnectWallet } = useWeb3();
  const { resetWalkthrough } = useWalkthrough();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // RTK Query hooks with polling - only when authenticated
  const { data: unreadCountData } = useGetUnreadNotificationCountQuery(
    undefined,
    {
      pollingInterval: 30000, // Poll every 30 seconds
      skip: !isAuthenticated, // Skip when not logged in
    }
  );
  const unreadCount = unreadCountData?.count || 0;

  const { data: conversations = [] } = useGetConversationsQuery(undefined, {
    pollingInterval: 30000,
    skip: !isAuthenticated, // Skip when not logged in
  });

  useGetSelfVerificationStatusQuery(undefined, {
    skip: !selectedUser?._id || !isAuthenticated, // Skip when not logged in
  });

  // Calculate unread messages from conversations
  const totalUnreadMessages = conversations.reduce(
    (total, conv) => total + (conv.unreadCount || 0),
    0
  );

  // Click outside handler for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

  const handleLogout = useCallback(async () => {
    try {
      setShowUserMenu(false);

      // Disconnect wallet if connected
      if (wallet.isConnected) {
        await disconnectWallet();
      }

      logout();
      startTransition(() => {
        navigate("/", { replace: true });
      });
    } catch (error) {
      console.error("Error during logout:", error);
      logout();
      startTransition(() => {
        navigate("/", { replace: true });
      });
    }
  }, [disconnectWallet, logout, navigate, wallet.isConnected]);

  const handleUserMenuToggle = useCallback(() => {
    setShowUserMenu((prev) => !prev);
  }, []);

  const handleProfileNavigation = useCallback(() => {
    setShowUserMenu(false);
    startTransition(() => {
      navigate("/account");
    });
  }, [navigate]);

  return (
    <header className="w-full py-2 md:py-3 bg-[#212428] shadow-md sticky top-0 z-50">
      <Container className="flex items-center justify-between py-0">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center group transition-transform hover:scale-105"
          aria-label="DezenMart Home"
        >
          <div className="w-8 h-8 md:w-9 md:h-9 relative overflow-hidden">
            <img
              src={FullLogo}
              className="w-full md:hidden transition-transform group-hover:scale-110 object-cover object-[25%_25%]"
              alt="dezenmart logo"
              loading="eager"
            />
            <img
              src={Logo}
              className="w-full hidden md:block transition-transform group-hover:scale-110 object-cover object-[25%_25%]"
              alt="dezenmart logo"
              loading="eager"
            />
          </div>
          <span className="ml-2 text-white font-medium hidden md:inline transition-opacity group-hover:opacity-90">
            DezenMart
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center max-lg:gap-4 lg:gap-8 xl:gap-10">
          {NavList.map(({ title, path }) => (
            <NavLink
              key={path}
              to={path}
              className="relative font-semibold text-sm lg:text-md group"
            >
              {({ isActive }) => (
                <>
                  <motion.span
                    className={`relative z-10 ${
                      isActive ? "text-Red" : "text-[#545456] group-hover:text-white"
                    }`}
                    animate={{ scale: isActive ? 1.05 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {title}
                  </motion.span>

                  {/* Animated underline */}
                  <motion.div
                    className="absolute bottom-[-6px] left-0 right-0 h-0.5 bg-Red rounded-full"
                    initial={false}
                    animate={{
                      scaleX: isActive ? 1 : 0,
                      opacity: isActive ? 1 : 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />

                  {/* Hover underline */}
                  {!isActive && (
                    <motion.div
                      className="absolute bottom-[-6px] left-0 right-0 h-0.5 bg-white/40 rounded-full"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <CurrencyToggle />

          {/* Token Selector */}
          <TokenSelector />

          {/* Tutorial/Help Button */}
          <WalkthroughTrigger variant="icon" />

          {/* Wallet button */}
          <WalletConnectButton />

          {isAuthenticated ? (
            <>
              <motion.button
                aria-label={`Notifications ${
                  unreadCount > 0 ? ", " + unreadCount + " unread" : ""
                }`}
                className="p-1.5 rounded-full hover:bg-[#292B30] transition-colors relative"
                onClick={() =>
                  startTransition(() => navigate("/notifications"))
                }
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  animate={unreadCount > 0 ? { rotate: [0, -15, 15, -15, 0] } : {}}
                  transition={{
                    duration: 0.5,
                    repeat: unreadCount > 0 ? Infinity : 0,
                    repeatDelay: 3,
                  }}
                >
                  <HiOutlineBell className="text-xl text-white" />
                </motion.div>
                <NotificationBadge count={unreadCount} />
              </motion.button>

              {/* User menu dropdown */}
              <div className="relative" ref={userMenuRef}>
                <motion.button
                  onClick={handleUserMenuToggle}
                  className="focus:outline-none focus:ring-2 focus:ring-Red focus:ring-opacity-50 rounded-full relative"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  aria-label="User menu"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.img
                    src={
                      typeof user?.profileImage === "string"
                        ? user.profileImage
                        : `https://avatar.iran.liara.run/username?username=[${
                            user?.name?.split(" ")[0] || ""
                          }+${user?.name?.split(" ")[1] || ""}]`
                    }
                    alt=""
                    className="w-8 h-8 rounded-full ring-2 ring-[#292B30] hover:ring-Red transition-all"
                    loading="lazy"
                    animate={{ rotate: showUserMenu ? 360 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  {!user?.selfVerification.isVerified && (
                    <motion.div
                      className="absolute -top-1 -right-1"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <div className="relative group">
                        <motion.div
                          className="w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <FiInfo className="text-black text-xs" />
                        </motion.div>
                        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-[200px] overflow-hidden">
                          <div className="font-semibold mb-1">
                            Account Verification Required
                          </div>
                          <div className="text-gray-300">
                            Complete passport verification to access trading,
                            withdrawals, and premium features
                          </div>
                          <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-48 bg-[#212428] rounded-md shadow-lg py-1 z-50 border border-[#292B30] overflow-hidden"
                      role="menu"
                      aria-orientation="vertical"
                    >
                      <motion.button
                        onClick={handleProfileNavigation}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#292B30] transition-colors"
                        role="menuitem"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        My Account
                      </motion.button>

                      <motion.button
                        onClick={() => {
                          setShowUserMenu(false);
                          resetWalkthrough();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#292B30] transition-colors"
                        role="menuitem"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-2">
                          <HiAcademicCap className="text-Red text-base" />
                          <span>View Tutorial</span>
                        </div>
                      </motion.button>

                      {!user?.selfVerification.isVerified && (
                        <motion.button
                          onClick={() => setShowVerifyModal(true)}
                          className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#292B30] transition-colors"
                          role="menuitem"
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center gap-2">
                            <span>Verify Account</span>
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                              <FiInfo className="text-yellow-500 text-sm cursor-help" />
                            </motion.div>
                          </div>
                        </motion.button>
                      )}
                      <motion.button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#292B30] transition-colors"
                        role="menuitem"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        Sign Out
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                title="Sign In"
                className="bg-Red text-white px-2 md:pl-2 md:pr-3 py-1.5 md:py-2 rounded-md hover:bg-opacity-90 transition-all"
                onClick={() => startTransition(() => navigate("/login"))}
                icon={<BiLogIn className="text-lg" />}
                iconPosition="start"
                aria-label="Sign in"
              />
            </motion.div>
          )}
        </div>
      </Container>
      <SefldVerification
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
      />
    </header>
  );
};

export default Header;
