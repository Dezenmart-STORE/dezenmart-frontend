import { motion } from "framer-motion";
import { RiSettings3Fill, RiVerifiedBadgeFill } from "react-icons/ri";
import { RiEdit2Fill } from "react-icons/ri";
import { MdOutlineVerifiedUser } from "react-icons/md";

interface ProfileHeaderProps {
  avatar: string;
  name: string;
  email: string;
  isVerified: boolean;
  onSettings: () => void;
  onEditProfile: () => void;
  onVerify: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  avatar,
  name,
  email,
  isVerified,
  onSettings,
  onEditProfile,
  onVerify,
}) => {
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">My Account</h1>
        <button
          aria-label="Settings"
          onClick={onSettings}
          className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
        >
          <RiSettings3Fill className="text-gray-400 text-xl" />
        </button>
      </div>

      {/* Profile card */}
      <motion.div
        className="bg-[#292B30] rounded-2xl p-4 flex items-center gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <img
          src={avatar || "https://placehold.co/80x80/292B30/ffffff?text=?"}
          alt={name}
          className="w-16 h-16 rounded-full object-cover border-2 border-red-600 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="font-bold text-white text-base truncate">{name}</h2>
            {isVerified ? (
              <RiVerifiedBadgeFill
                className="text-green-400 text-base flex-shrink-0"
                title="Verified account"
              />
            ) : (
              <span className="text-xs bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                Unverified
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm truncate mt-0.5">{email}</p>
        </div>
      </motion.div>

      {/* Action buttons — stack on tiny screens, side-by-side from xxs up */}
      <motion.div
        className="flex flex-col xxs:flex-row gap-2 xxs:gap-3 mt-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <button
          onClick={onEditProfile}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 active:scale-[0.98] transition-all"
        >
          <RiEdit2Fill className="text-base" />
          Edit Profile
        </button>

        {!isVerified && (
          <button
            onClick={onVerify}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all"
          >
            <MdOutlineVerifiedUser className="text-base" />
            Verify Account
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default ProfileHeader;
