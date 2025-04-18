import { useState, useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Container from "../components/common/Container";
import ProfileHeader from "../components/account/ProfileHeader";
import TabNavigation from "../components/account/TabNavigation";
import Settings from "../components/account/Settings";
import EditProfile from "../components/account/EditProfile";
import { LiaAngleDownSolid } from "react-icons/lia";
import Button from "../components/common/Button";

const TabContent = lazy(() => import("../components/account/TabContent"));

import { Avatar2, Product1 } from ".";
import { TabOption, TabType } from "../utils/types";

const TAB_OPTIONS: TabOption[] = [
  { id: "1", label: "Order History" },
  { id: "2", label: "Saved Items" },
  { id: "3", label: "Dispute Center" },
];

const Account = () => {
  const [tab, setTab] = useState<TabType>("1");
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const profileData = {
    name: "Albert Flores",
    dob: "01/01/1988",
    email: "albertflores@mail.com",
    phone: "(308) 555-0121",
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  // Reset to top of page when tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <div className="bg-Dark min-h-screen text-white">
      <Container className="py-6 md:py-10">
        {showSettings ? (
          <Settings showSettings={setShowSettings} />
        ) : showEditProfile ? (
          <EditProfile
            avatar={Avatar2}
            showEditProfile={setShowEditProfile}
            currentProfile={profileData}
          />
        ) : (
          <>
            <ProfileHeader
              avatar={Avatar2}
              name="Albert Flores"
              email="albertflores@mail.com"
              showSettings={setShowSettings}
            />

            <motion.div
              className="w-full max-w-[650px] mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                title="Edit Profile"
                icon={<LiaAngleDownSolid />}
                path=""
                onClick={() => setShowEditProfile(true)}
                className="bg-white text-black text-lg font-bold h-11 rounded-none flex justify-center w-full border-none outline-none text-center my-2 hover:bg-gray-100 transition-colors"
              />
            </motion.div>

            <TabNavigation
              activeTab={tab}
              onTabChange={setTab}
              options={TAB_OPTIONS}
            />

            <AnimatePresence mode="wait">
              {isLoading ? (
                <div>Loading...</div>
              ) : (
                <Suspense fallback={<div>Loading...</div>}>
                  <TabContent activeTab={tab} productImage={Product1} />
                </Suspense>
              )}
            </AnimatePresence>
          </>
        )}
      </Container>
    </div>
  );
};

export default Account;
