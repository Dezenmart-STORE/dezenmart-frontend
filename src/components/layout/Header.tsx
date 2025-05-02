import { useState, useRef, useEffect } from "react";
import { HiOutlineBell } from "react-icons/hi";
import { BiLogIn, BiWallet } from "react-icons/bi";
import { Logo } from "../../pages";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Container from "../common/Container";
import { useNotifications } from "../../utils/hooks/useNotifications";
import NotificationBadge from "../notifications/NotificationBadge";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import { useWallet } from "../../utils/hooks/useWallet";
import Modal from "../common/Modal";
import ConnectWallet from "../trade/ConnectWallet";

const NavList = [
  { title: "Home", path: "/" },
  { title: "Product", path: "/product" },
  { title: "Trade", path: "/trades" },
  { title: "Community", path: "/community" },
];

const Header = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected, account, disconnect } = useWallet();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Compute shortened address
  const shortenedAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await disconnect(); // Disconnect wallet
      logout(); // Log out user
      navigate("/");
      setShowUserMenu(false);
    } catch (err) {
      console.error("Error during logout:", err);
    }
  };

  return (
    <header className="w-full py-3 bg-[#212428] shadow-md sticky top-0 z-50">
      <Container className="flex items-center justify-between py-0">
        <Link
          to="/"
          className="flex items-center group transition-transform hover:scale-105"
        >
          <div className="w-9 h-9 relative overflow-hidden">
            <img
              src={Logo}
              className="w-full transition-transform group-hover:scale-110 object-cover object-[25%_25%]"
              alt="DezenMart"
            />
          </div>
          <span className="ml-2 text-white font-medium hidden md:inline transition-opacity group-hover:opacity-90">
            DezenMart
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center max-md:gap-6 gap-10">
          {NavList.map(({ title, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `font-semibold text-md transition-all ${
                  isActive
                    ? "text-Red relative after:content-[''] after:absolute after:bottom-[-6px] after:left-0 after:w-full after:h-0.5 after:bg-Red after:rounded-full"
                    : "text-[#545456] hover:text-white"
                }`
              }
            >
              {title}
            </NavLink>
          ))}
        </nav>

        {/* Right section: Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWallet(true)}
            className="flex items-center gap-1.5 bg-[#292B30] text-white px-3 py-1.5 rounded-md hover:bg-[#33363b] transition-all"
          >
            <BiWallet className="text-lg" />
            <span className="text-sm font-medium">
              {isConnected ? shortenedAddress : "Connect Wallet"}
            </span>
          </button>

          {isAuthenticated ? (
            <>
              <button
                aria-label="Notifications"
                className="p-1.5 rounded-full hover:bg-[#292B30] transition-colors relative"
                onClick={() => navigate("/notifications")}
              >
                <HiOutlineBell className="text-xl text-white" />
                <NotificationBadge count={unreadCount} />
              </button>

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="focus:outline-none"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                >
                  <img
                    src={
                      typeof user?.profileImage === "string"
                        ? user?.profileImage
                        : `https://avatar.iran.liara.run/username?username=[${
                            user?.name.split(" ")[0]
                          }+${user?.name.split(" ")[1]}]`
                    }
                    alt="User profile"
                    className="w-8 h-8 rounded-full ring-2 ring-[#292B30] hover:ring-Red transition-all"
                  />
                </button>

                {/* Dropdown menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#212428] rounded-md shadow-lg py-1 z-50">
                    <Link
                      to="/account"
                      className="block px-4 py-2 text-sm text-white hover:bg-[#292B30]"
                      onClick={() => setShowUserMenu(false)}
                    >
                      My Account
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#292B30]"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button
              title="Sign In"
              className="bg-Red text-white pl-2 pr-3 py-2 rounded-md hover:bg-opacity-90 transition-all"
              onClick={() => navigate("/login")}
              icon={<BiLogIn className="text-lg" />}
              iconPosition="start"
            />
          )}
        </div>
      </Container>
      {showWallet && (
        <Modal onClose={() => setShowWallet(false)} isOpen>
          <ConnectWallet showAlternatives />
        </Modal>
      )}
    </header>
  );
};

export default Header;