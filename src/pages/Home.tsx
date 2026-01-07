import { Link } from "react-router-dom";
import { Browseproduct, Mywallet, Pen, Pen2, Trackorder } from ".";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import Container from "../components/common/Container";
import ProductList from "../components/product/ProductList";
import BannerCarousel from "../components/common/BannerCarousel";
import FeaturedHero from "../components/product/FeaturedHero";
import CategoryPreview from "../components/common/CategoryPreview";
import { SectionIcons } from "../components/common/SectionIcons";
import { useState, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { useCurrency } from "../context/CurrencyContext";
import { useGetSponsoredProductsQuery } from "../store/api";
import WalletConnectionModal from "../components/web3/WalletConnectionModal";
import WalletDetailsModal from "../components/web3/WalletDetailsModal";
import { GoUnverified, GoVerified } from "react-icons/go";
import { useSEO } from "../utils/hooks/useSEO";
import { PAGE_SEO, SEO_CONFIG } from "../utils/seo/seoConfig";

const QUICK_ACTIONS_CONFIG = [
  {
    icon: Browseproduct,
    title: "Browse Products",
    path: "/product",
    isWalletAction: false,
  },
  {
    icon: Trackorder,
    title: "Track Order",
    path: "/account",
    isWalletAction: false,
  },
  {
    icon: Mywallet,
    title: "My Wallet",
    isWalletAction: true,
    path: undefined,
  },
] as const;

const BANNERS_DATA = [
  {
    title: "Smart Ecommerce for",
    subtitle: "creators",
    primaryImage: Pen,
    secondaryImage: Pen2,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Special Offers for",
    subtitle: "new users",
    primaryImage: Pen,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Smart Ecommerce for",
    subtitle: "creators",
    primaryImage: Pen,
    secondaryImage: Pen2,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Special Offers for",
    subtitle: "new users",
    primaryImage: Pen,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Smart Ecommerce for",
    subtitle: "creators",
    primaryImage: Pen,
    secondaryImage: Pen2,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Special Offers for",
    subtitle: "new users",
    primaryImage: Pen,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Smart Ecommerce for",
    subtitle: "creators",
    primaryImage: Pen,
    secondaryImage: Pen2,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Special Offers for",
    subtitle: "new users",
    primaryImage: Pen,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
] as const;

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [showWallet, setShowWallet] = useState(false);
  const { wallet } = useWeb3();
  const { convertPrice, selectedTokenSymbol } = useCurrency();
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch sponsored products for hero section
  const { data: sponsoredProducts = [] } = useGetSponsoredProductsQuery();

  // Calculate dynamic price threshold (equivalent of 20 USD in selected token)
  // All product prices are stored in USD in the backend
  const valuePriceThreshold = useMemo(() => {
    // Convert 20 USD to the selected token
    return convertPrice(20, "USD", selectedTokenSymbol);
  }, [selectedTokenSymbol, convertPrice]);

  // Format the threshold for display (round to 2 decimal places)
  const formattedThreshold = useMemo(() => {
    return Math.round(valuePriceThreshold * 100) / 100;
  }, [valuePriceThreshold]);

  // SEO Configuration for homepage
  useSEO({
    title: PAGE_SEO.home.title,
    description: PAGE_SEO.home.description,
    keywords: PAGE_SEO.home.keywords,
    type: "website",
    structuredData: [
      // Organization Schema
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        ...SEO_CONFIG.organization,
      },
      // WebSite Schema with search action
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SEO_CONFIG.siteName,
        url: SEO_CONFIG.siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SEO_CONFIG.siteUrl}/product?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  });

  const handleWalletOpen = useCallback(() => {
    if (wallet.isConnected && wallet.address) {
      setShowDetailsModal(true);
      setShowConnectionModal(false);
    } else {
      setShowDetailsModal(false);
      setShowConnectionModal(true);
    }
    setShowWallet(true);
  }, [wallet.isConnected, wallet.address]);

  const handleWalletClose = useCallback(() => {
    setShowDetailsModal(false);
    setShowConnectionModal(false);
    setShowWallet(false);
  }, []);

  const quickActions = useMemo(() => {
    return QUICK_ACTIONS_CONFIG.map((action) => ({
      ...action,
      onclick: action.isWalletAction ? handleWalletOpen : undefined,
    }));
  }, [handleWalletOpen]);

  const displayName = useMemo(() => {
    if (!isAuthenticated || !user?.name) return "User";

    if (typeof user.name === "string") {
      const nameParts = user.name.split(" ");
      return nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
        : nameParts[0];
    }
    return "User";
  }, [user?.name]);

  const userGreeting = useMemo(() => {
    if (!isAuthenticated) return "User";
    return user?.name || "User";
  }, [isAuthenticated, user?.name]);

  return (
    <div className="bg-Dark min-h-screen">
      <Container className="py-6 md:py-20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-[20px] text-white mb-0 flex items-center">
              Welcome,&nbsp;
              {isAuthenticated ? (
                <>
                  <span className="max-xs:hidden">{userGreeting}</span>
                  <span className="xs:hidden inline-block">{displayName}</span>
                  &nbsp;
                  {user?.selfVerification?.isVerified ? (
                    <div className="relative group inline-block">
                      <GoVerified className="text-green-500 text-2xl cursor-help" />
                      <div className="absolute md:bottom-full md:top-auto top-full left-1/2 transform -translate-x-1/2 md:mb-2 mt-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Account Verified ✓
                        <div className="absolute md:top-full top-auto bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 md:border-t-4 border-b-4 border-transparent md:border-t-gray-800 border-b-gray-800"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group inline-block">
                      <GoUnverified className="text-yellow-500 text-2xl cursor-help" />
                      <div className="absolute md:bottom-full md:top-auto top-full left-1/2 transform -translate-x-1/2 md:mb-2 mt-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Account Not Verified
                        <br />
                        Click "Verify Account" button on your account page
                        <div className="absolute md:top-full top-auto bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 md:border-t-4 border-b-4 border-transparent md:border-t-gray-800 border-b-gray-800"></div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                "User"
              )}
            </h4>
            <span className="text-[#C6C6C8] text-[13px]">
              What would you like to do today?
            </span>
          </div>
          {/* <div className="flex md:hidden items-center">
            <RiVerifiedBadgeFill className="text-[#4FA3FF] text-xl" />
          </div> */}
        </div>

        {/* Quick action buttons */}
        <div className="flex justify-evenly md:justify-start mt-6 md:mt-20 gap-4 md:gap-10">
          {quickActions.map((action, index) =>
            action.path ? (
              <Link
                key={index}
                to={action.path}
                className="flex flex-col items-center justify-center gap-2 group transition-transform hover:scale-105 active:scale-95"
                prefetch="intent"
              >
                <span className="bg-[#292B30] rounded-full p-4 md:p-8 flex items-center justify-center transition-colors group-hover:bg-[#33363b]">
                  <img
                    src={action.icon}
                    alt=""
                    className="w-[20px] h-[20px] md:w-[24px] md:h-[24px]"
                    loading="lazy"
                  />
                </span>
                <h3 className="text-[#AEAEB2] text-sm md:text-lg group-hover:text-white transition-colors">
                  {action.title}
                </h3>
              </Link>
            ) : (
              <button
                key={index}
                onClick={action.onclick}
                className="flex flex-col items-center justify-center gap-2 group transition-transform hover:scale-105 active:scale-95"
                type="button"
              >
                <span className="bg-[#292B30] rounded-full p-4 md:p-8 flex items-center justify-center transition-colors group-hover:bg-[#33363b]">
                  <img
                    src={action.icon}
                    alt=""
                    className="w-[20px] h-[20px] md:w-[24px] md:h-[24px]"
                    loading="lazy"
                  />
                </span>
                <h3 className="text-[#AEAEB2] text-sm md:text-lg group-hover:text-white transition-colors">
                  {action.title}
                </h3>
              </button>
            )
          )}
        </div>

        {/* Banner Carousel */}
        <BannerCarousel
          banners={[...BANNERS_DATA]}
          autoRotate={true}
          rotationInterval={6000}
        />

        {/* Hero Products Section - Large, Visual */}
        <FeaturedHero
          title="🔥 Today's Picks"
          subtitle="Curated products just for you"
          products={sponsoredProducts}
          maxItems={4}
        />

        {/* Category Preview - Visual Discovery */}
        <CategoryPreview
          title="Shop by Category"
          subtitle="Explore our diverse marketplace"
        />

        {/* Fresh Arrivals Section */}
        <ProductList
          title="Fresh Arrivals"
          subtitle="New products from this week"
          path="/product"
          className="mt-6 md:mt-10"
          isCategoryView={false}
          maxItems={6}
          sortBy="createdAt"
          sortOrder="desc"
          filterBy="new"
          showViewAll={true}
          icon={SectionIcons.FreshArrivals}
          iconColor="text-green-400"
        />

        {/* Top Sellers Section */}
        <ProductList
          title="From Top-Rated Sellers"
          subtitle="Shop with confidence from verified merchants"
          path="/product"
          className="mt-6 md:mt-10"
          isCategoryView={false}
          maxItems={6}
          filterBy="topSellers"
          showViewAll={true}
          icon={SectionIcons.TopSellers}
          iconColor="text-yellow-400"
        />

        {/* Value Section - Dynamic based on selected token */}
        <ProductList
          title={`Under ${formattedThreshold} ${selectedTokenSymbol}`}
          subtitle="Great finds at amazing prices"
          path="/product"
          className="mt-6 md:mt-10"
          isCategoryView={false}
          maxItems={6}
          maxPrice={valuePriceThreshold}
          showViewAll={true}
          icon={SectionIcons.ValuePrice}
          iconColor="text-emerald-400"
        />
      </Container>
      {showWallet && showConnectionModal && !showDetailsModal && (
        <WalletConnectionModal
          isOpen={showConnectionModal}
          onClose={handleWalletClose}
        />
      )}
      {showWallet && showDetailsModal && !showConnectionModal && (
        <WalletDetailsModal
          isOpen={showDetailsModal}
          onClose={handleWalletClose}
        />
      )}
    </div>
  );
};

export default Home;
