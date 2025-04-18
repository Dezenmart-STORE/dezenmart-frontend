import { HiOutlineBell } from "react-icons/hi";
import { Avatar, Mainlogo } from "../../pages";
import { Link, NavLink } from "react-router-dom";
import Container from "../common/Container";

const NavList = [
  { title: "Home", path: "/" },
  { title: "Product", path: "/product" },
  { title: "Trade", path: "/trades" },
  { title: "Community", path: "/community" },
  { title: "Account", path: "/account" },
];

const Header = () => {
  // const location = useLocation();

  return (
    <header className="w-full py-3 bg-[#212428] shadow-md sticky top-0 z-50">
      <Container className="flex items-center justify-between py-0">
        {/* <div className="flex items-center gap-3"> */}

        {/* {location.pathname !== "/" && (
            <button
              className="md:hidden text-white p-1.5 rounded-full hover:bg-[#292B30] transition-colors"
              onClick={() => window.history.back()}
              aria-label="Go back"
            >
              <IoChevronBackOutline className="h-5 w-5" />
            </button>
          )} */}

        <Link
          to="/"
          className="flex items-center group transition-transform hover:scale-105"
        >
          <div className="relative overflow-hidden rounded-md">
            <img
              src={Mainlogo}
              className="w-[35px] transition-transform group-hover:scale-110"
              alt="DezenMart"
            />
          </div>
          <span className="ml-2 text-white font-medium hidden md:inline transition-opacity group-hover:opacity-90">
            DezenMart
          </span>
        </Link>
        {/* </div> */}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-10">
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
            aria-label="Notifications"
            className="p-1.5 rounded-full hover:bg-[#292B30] transition-colors"
          >
            <HiOutlineBell className="text-xl text-white" />
          </button>

          <Link to="/account" className="transition-transform hover:scale-105">
            <img
              src={Avatar}
              alt="User profile"
              className="w-8 h-8 rounded-full ring-2 ring-[#292B30] hover:ring-Red transition-all"
            />
          </Link>
        </div>
      </Container>
    </header>
  );
};

export default Header;
