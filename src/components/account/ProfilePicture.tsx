import { motion } from "framer-motion";
import { RiEdit2Fill } from "react-icons/ri";
import { useRef, useState } from "react";

interface ProfilePictureProps {
  avatar: string;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({ avatar }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="relative">
        <motion.img
          src={previewImage || avatar}
          className="w-24 h-24 sm:w-[110px] sm:h-[110px] rounded-full object-cover border-2 border-Red"
          alt="User profile"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        />
        <motion.button
          type="button"
          className="absolute bottom-0 right-0 bg-Red p-2 rounded-full"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
        >
          <RiEdit2Fill className="text-white text-sm" />
        </motion.button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </motion.div>
  );
};

export default ProfilePicture;
