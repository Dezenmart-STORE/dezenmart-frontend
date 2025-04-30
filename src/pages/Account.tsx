import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Container from "../components/common/Container";
import ProfileHeader from "../components/account/ProfileHeader";
import TabNavigation from "../components/account/overview/TabNavigation.tsx";
import { LiaAngleDownSolid } from "react-icons/lia";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useUserManagement } from "../utils/hooks/useUserManagement.ts";
const TabContent = lazy(
  () => import("../components/account/overview/TabContent.tsx")
);
const EditProfile = lazy(
  () => import("../components/account/edit/EditProfile")
);
const Settings = lazy(() => import("../components/account/settings/Settings"));
import { Product1 } from ".";
import { TabOption, TabType } from "../utils/types";

const TAB_OPTIONS: TabOption[] = [
  { id: "1", label: "Order History" },
  { id: "2", label: "Saved Items" },
  { id: "3", label: "Dispute Center" },
  { id: "4", label: "Referrals" },
];

const Account = () => {
  const {
    selectedUser,
    formattedSelectedUser,
    isLoading,
    error,
    fetchUserById,
    isError,
    resetSelectedUser,
  } = useUserManagement();

  const [tab, setTab] = useState<TabType>("1");
  const [pageLoading, setPageLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    // Fetch current user profile
    const userId = localStorage.getItem("userId");
    if (userId) {
      fetchUserById(userId, false);
    }

    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 600);

    return () => {
      clearTimeout(timer);
      resetSelectedUser();
    };
  }, [fetchUserById, resetSelectedUser]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const handleShowEditProfile = useCallback(() => setShowEditProfile(true), []);

  if (isLoading || pageLoading) {
    return (
      <div className="bg-Dark min-h-screen text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-Dark min-h-screen text-white flex items-center justify-center">
        <div className="text-center p-8 bg-[#292B30] rounded-lg">
          <h2 className="text-xl font-bold mb-4">Unable to load profile</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button
            title="Retry"
            onClick={() => {
              const userId = localStorage.getItem("userId");
              if (userId) fetchUserById(userId);
            }}
            className="mx-auto bg-Red hover:bg-[#e02d37] text-white px-6 py-2 rounded-lg transition-colors"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-Dark min-h-screen text-white">
      <Container className="py-6 md:py-10">
        {showSettings ? (
          <Suspense fallback={<LoadingSpinner />}>
            <Settings
              showSettings={setShowSettings}
              profileData={formattedSelectedUser}
            />
          </Suspense>
        ) : showEditProfile ? (
          <Suspense fallback={<LoadingSpinner />}>
            <EditProfile
              avatar={
                typeof selectedUser?.profileImage === "string"
                  ? selectedUser?.profileImage
                  : ""
              }
              showEditProfile={setShowEditProfile}
              currentProfile={formattedSelectedUser}
            />
          </Suspense>
        ) : (
          selectedUser && (
            <>
              <ProfileHeader
                avatar={
                  typeof selectedUser?.profileImage === "string"
                    ? selectedUser?.profileImage
                    : ""
                }
                name={selectedUser.name}
                email={selectedUser.email}
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
                  onClick={handleShowEditProfile}
                  className="bg-white text-black text-lg font-bold h-11 rounded-none flex justify-center w-full border-none outline-none text-center my-2 hover:bg-gray-100 transition-colors"
                />
              </motion.div>
              <TabNavigation
                activeTab={tab}
                onTabChange={setTab}
                options={TAB_OPTIONS}
              />
              <AnimatePresence mode="wait">
                <Suspense fallback={<LoadingSpinner />}>
                  <TabContent
                    activeTab={tab}
                    productImage={Product1}
                    milestones={selectedUser.milestones}
                    referralCode={selectedUser.referralCode}
                    referralCount={selectedUser.referralCount}
                    points={{
                      total: selectedUser.totalPoints,
                      available: selectedUser.availablePoints,
                    }}
                  />
                </Suspense>
              </AnimatePresence>
            </>
          )
        )}
      </Container>
    </div>
  );
};

export default Account;
