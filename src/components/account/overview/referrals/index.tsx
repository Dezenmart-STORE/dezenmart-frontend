import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import PointsDisplay from "./PointsDisplay";
import ReferralInvite from "./Invite";
import ReferralHistory from "./History";
import ReferralSkeleton from "./Skeleton";
import { ReferralData } from "../../../../utils/types";

const fetchReferralData = () => {
  return new Promise<ReferralData>((resolve) => {
    setTimeout(() => {
      resolve({
        activePoints: 10,
        usedPoints: 150,
        promoCode: "GBD21",
        history: [
          {
            id: "1",
            name: "Samuel Ogo",
            type: "Reward for an invite",
            points: 5,
            action: "from",
            date: "01.15.22 15:43",
          },
          {
            id: "2",
            name: "Samuel Ogo",
            type: "Invitation accepted",
            points: 0,
            date: "01.15.22 15:43",
          },
          {
            id: "3",
            name: "Steve Olayinka",
            type: "Invitation sent",
            points: 0,
            date: "01.15.22 15:43",
          },
          {
            id: "4",
            name: "",
            type: "Received referral credits",
            status: "Authorization code",
            points: 5,
            date: "01.15.22 15:43",
          },
        ],
      });
    }, 800);
  });
};

const ReferralsTab = () => {
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const inviteRef = useRef(null);

  const handleInviteFriends = useCallback(() => {
    setIsShareModalOpen(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const getData = async () => {
      try {
        const data: ReferralData = await fetchReferralData();
        if (isMounted) {
          setReferralData(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load referral data");
          setLoading(false);
        }
      }
    };

    getData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <ReferralSkeleton />;
  }

  if (error) {
    return (
      <motion.div
        className="py-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="text-red-400">{error}</p>
        <button
          className="mt-4 bg-Red text-white py-2 px-4 rounded"
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchReferralData()
              .then((data) => {
                setReferralData(data);
                setLoading(false);
              })
              .catch((err) => {
                setError(err.message || "Failed to load referral data");
                setLoading(false);
              });
          }}
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PointsDisplay
        activePoints={referralData?.activePoints || 0}
        usedPoints={referralData?.usedPoints || 0}
      />

      <ReferralInvite
        promoCode={referralData?.promoCode || ""}
        isShareModalOpen={isShareModalOpen}
        setIsShareModalOpen={setIsShareModalOpen}
        ref={inviteRef}
      />

      <ReferralHistory
        history={referralData?.history || []}
        onInviteFriends={handleInviteFriends}
      />
    </motion.div>
  );
};

export default ReferralsTab;
