import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import Container from "../components/common/Container";
import ProfileHeader from "../components/account/ProfileHeader";
import TabNavigation from "../components/account/overview/TabNavigation";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useGetUserProfileQuery } from "../store/api";
import { TabOption, TabType } from "../utils/types";
import { useAuth } from "../context/AuthContext";
import SefldVerification from "../components/common/SefldVerification";
import DeliveryAddressManager from "../components/account/DeliveryAddressManager";

const TabContent = lazy(
  () => import("../components/account/overview/TabContent")
);
const EditProfile = lazy(
  () => import("../components/account/edit/EditProfile")
);
const Settings = lazy(
  () => import("../components/account/settings/Settings")
);

const TAB_OPTIONS: TabOption[] = [
  { id: "1", label: "Saved Items" },
  { id: "2", label: "Rewards" },
  { id: "3", label: "Order History" },
  { id: "4", label: "Disputes" },
  { id: "5", label: "My Products" },
];

export type AccountViewState =
  | "overview"
  | "settings"
  | "edit-profile"
  | "delivery-addresses";

const Loader = () => (
  <div className="flex justify-center items-center min-h-[200px]">
    <LoadingSpinner />
  </div>
);

const Account = () => {
  const { data: selectedUser, isLoading, error, refetch } = useGetUserProfileQuery();
  const { user: _user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>("1");
  const [viewState, setViewState] = useState<AccountViewState>("overview");
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Honour ?tab= deep-link param
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && TAB_OPTIONS.some((o) => o.id === tabParam)) {
      setActiveTab(tabParam as TabType);
      setViewState("overview");
      searchParams.delete("tab");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Scroll top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const handleEditProfile = useCallback(() => setViewState("edit-profile"), []);
  const handleSettings    = useCallback(() => setViewState("settings"),      []);
  const handleOverview    = useCallback(() => setViewState("overview"),       []);
  const handleVerify      = useCallback(() => setShowVerifyModal(true),       []);

  // ── Loading / error guards ──────────────────────────────────────────
  if (isLoading && !selectedUser) {
    return (
      <div className="bg-[#212428] min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if ((error || !selectedUser) && !isLoading) {
    return (
      <div className="bg-[#212428] min-h-screen flex items-center justify-center px-4">
        <div className="text-center bg-[#292B30] rounded-2xl p-8 max-w-sm w-full">
          <p className="text-white font-semibold mb-2">Couldn't load your profile</p>
          <p className="text-gray-400 text-sm mb-6">
            Check your connection and try again.
          </p>
          <button
            onClick={() => refetch()}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!selectedUser) return null;

  const avatar =
    typeof selectedUser.profileImage === "string"
      ? selectedUser.profileImage
      : "";

  const isVerified = selectedUser.selfVerification?.isVerified ?? false;

  // ── Sub-views (settings, edit, delivery addresses) ──────────────────
  if (viewState === "settings") {
    return (
      <div className="bg-[#212428] min-h-screen text-white">
        <Container className="py-6">
          <Suspense fallback={<Loader />}>
            <Settings setViewState={(s) => setViewState(s as AccountViewState)} />
          </Suspense>
        </Container>
      </div>
    );
  }

  if (viewState === "edit-profile") {
    return (
      <div className="bg-[#212428] min-h-screen text-white">
        <Container className="py-6">
          <Suspense fallback={<Loader />}>
            <EditProfile
              avatar={avatar}
              setViewState={handleOverview}
              currentProfile={{
                ...(selectedUser || {}),
                dob: (selectedUser as any)?.dob || "",
                phone: (selectedUser as any)?.phone || "",
              }}
            />
          </Suspense>
        </Container>
      </div>
    );
  }

  if (viewState === "delivery-addresses") {
    return (
      <div className="bg-[#212428] min-h-screen text-white">
        <Container className="py-6">
          <DeliveryAddressManager onBack={handleSettings} />
        </Container>
      </div>
    );
  }

  // ── Overview ────────────────────────────────────────────────────────
  return (
    <div className="bg-[#212428] min-h-screen text-white">
      <Container className="py-6">
        <ProfileHeader
          avatar={avatar}
          name={selectedUser.name}
          email={selectedUser.email}
          isVerified={isVerified}
          onSettings={handleSettings}
          onEditProfile={handleEditProfile}
          onVerify={handleVerify}
        />

        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          options={TAB_OPTIONS}
        />

        <div className="mt-4">
          <AnimatePresence mode="wait">
            <Suspense fallback={<Loader />}>
              <TabContent
                activeTab={activeTab}
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
        </div>
      </Container>

      <SefldVerification
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
      />
    </div>
  );
};

export default Account;
