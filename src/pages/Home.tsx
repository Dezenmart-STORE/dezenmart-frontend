import { Link } from "react-router-dom";
import { Browseproduct, Mywallet, Pen, Pen2, Trackorder } from ".";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import Container from "../components/common/Container";
import ProductList from "../components/product/ProductList";
import BannerCarousel from "../components/common/BannerCarousel";
import { useState } from "react";
import ConnectWallet from "../components/trade/ConnectWallet";
import Modal from "../components/common/Modal";

const Home = () => {
  const [showWallet, setShowWallet] = useState(false);
  const quickActions = [
    {
      icon: Browseproduct,
      title: "Browse Products",
      path: "/product",
    },
    {
      icon: Trackorder,
      title: "Track Order",
      path: "/account",
    },
    {
      icon: Mywallet,
      title: "My Wallet",
      onclick: () => setShowWallet(true),
    },
  ];
  const banners = [
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
  ];
  return (
    <div className="bg-Dark min-h-screen">
      <Container className="py-6 md:py-20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-[20px] text-white mb-0">Welcome, Joe.</h4>
            <span className="text-[#C6C6C8] text-[13px]">
              What would you like to do today?
            </span>
          </div>
          <div className="flex md:hidden items-center">
            <RiVerifiedBadgeFill className="text-[#4FA3FF] text-xl" />
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex justify-evenly md:justify-start mt-6 md:mt-20 gap-4 md:gap-10">
          {quickActions.map((action, index) =>
            action.path ? (
              <Link
                key={index}
                to={action.path}
                className="flex flex-col items-center justify-center gap-2 group transition-transform hover:scale-105"
              >
                <span className="bg-[#292B30] rounded-full p-4 md:p-8 flex items-center justify-center transition-colors group-hover:bg-[#333]">
                  <img
                    src={action.icon}
                    alt=""
                    className="w-[20px] h-[20px] md:w-[24px] md:h-[24px]"
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
                className="flex flex-col items-center justify-center gap-2 group transition-transform hover:scale-105"
              >
                <span className="bg-[#292B30] rounded-full p-4 md:p-8 flex items-center justify-center transition-colors group-hover:bg-[#333]">
                  <img
                    src={action.icon}
                    alt=""
                    className="w-[20px] h-[20px] md:w-[24px] md:h-[24px]"
                  />
                </span>
                <h3 className="text-[#AEAEB2] text-sm md:text-lg group-hover:text-white transition-colors">
                  {action.title}
                </h3>
              </button>
            )
          )}
        </div>

        {/* <div className="flex justify-between items-center px-4 bg-Red rounded-lg mt-8 md:mt-28 overflow-hidden">
          <h5 className="text-white text-base md:text-xl p-4">
            Smart Ecommerce for{" "}
            <span className="uppercase font-bold block md:inline">
              creators
            </span>
          </h5>
          <div className="flex items-center justify-center">
            <img
              src={Pen}
              alt=""
              className="w-[50px] h-[50px] md:w-[90px] md:h-[90px]"
            />
            <img
              src={Pen2}
              alt=""
              className="w-[30px] h-[30px] md:w-[69px] md:h-[67px]"
            />
          </div>
        </div> */}

        <BannerCarousel
          banners={banners}
          autoRotate={true}
          rotationInterval={6000}
        />

        <ProductList
          title="Featured Product"
          path="/product"
          className="mt-6 md:mt-10"
          isCategoryView={false}
          isFeatured={true}
        />
      </Container>
      {showWallet && (
        <Modal onClose={() => setShowWallet(false)} isOpen>
          <ConnectWallet showAlternatives />
        </Modal>
      )}
    </div>
  );
};

export default Home;
