// import { motion } from "framer-motion";
// import { LiaAngleLeftSolid } from "react-icons/lia";
// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import ProfilePicture from "./ProfilePicture";
// import ProfileField from "./ProfileField";
// import PhoneInput from "./PhoneInput";
// import Button from "../common/Button";

// // Validation schema
// const profileSchema = z.object({
//   name: z.string().min(2, "Name must be at least 2 characters long"),
//   dob: z
//     .string()
//     .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Invalid date format (MM/DD/YYYY)"),
//   email: z.string().email("Please enter a valid email address"),
//   phone: z.string().min(10, "Please enter a valid phone number"),
// });

// type ProfileFormData = z.infer<typeof profileSchema>;

// interface EditProfileProps {
//   avatar: string;
//   showEditProfile: React.Dispatch<React.SetStateAction<boolean>>;
//   currentProfile: {
//     name: string;
//     dob: string;
//     email: string;
//     phone: string;
//   };
// }

// const EditProfile: React.FC<EditProfileProps> = ({
//   avatar,
//   showEditProfile,
//   currentProfile,
// }) => {
//   const [countryCode, setCountryCode] = useState("US");

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm<ProfileFormData>({
//     resolver: zodResolver(profileSchema),
//     defaultValues: currentProfile,
//   });

//   const onSubmit = (data: ProfileFormData) => {
//     console.log("Profile data submitted:", data);
//     // future: update the user profile data through your API
//     // On success, navigate back to profile page
//     showEditProfile(false);
//   };

//   return (
//     <motion.div
//       className="mt-4"
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       transition={{ duration: 0.3 }}
//     >
//       <div className="flex items-center gap-4 mb-8">
//         <motion.button
//           aria-label="Back to Profile"
//           className="hover:opacity-80 transition-opacity"
//           transition={{ type: "spring", stiffness: 300 }}
//           onClick={() => showEditProfile(false)}
//           whileHover={{ x: -3 }}
//           whileTap={{ scale: 0.95 }}
//         >
//           <LiaAngleLeftSolid className="text-white text-2xl" />
//         </motion.button>
//         <h3 className="text-white text-2xl font-semibold">Edit Profile</h3>
//       </div>

//       <motion.form
//         onSubmit={handleSubmit(onSubmit)}
//         className="flex flex-col gap-4"
//         initial={{ y: 20, opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         transition={{ delay: 0.1, duration: 0.4 }}
//       >
//         <ProfilePicture avatar={avatar} />

//         <div className="space-y-4 mt-6">
//           <ProfileField
//             label="Name"
//             icon="person"
//             placeholder="Full Name"
//             register={register("name")}
//             error={errors.name?.message}
//             delay={0.2}
//           />

//           <ProfileField
//             label="Date of Birth"
//             icon="calendar"
//             placeholder="MM/DD/YYYY"
//             register={register("dob")}
//             error={errors.dob?.message}
//             delay={0.3}
//           />

//           <ProfileField
//             label="Email"
//             icon="email"
//             placeholder="Email Address"
//             register={register("email")}
//             error={errors.email?.message}
//             delay={0.4}
//           />

//           <PhoneInput
//             register={register("phone")}
//             error={errors.phone?.message}
//             countryCode={countryCode}
//             setCountryCode={setCountryCode}
//             delay={0.5}
//           />

//           <motion.div
//             className="mt-6"
//             initial={{ opacity: 0, y: 10 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.6 }}
//           >
//             <Button
//               title="Shipping Addresses"
//               className="flex justify-between items-center w-full bg-[#292B30] border-0 rounded text-white px-6 py-4 transition-colors hover:bg-[#343539]"
//               path="/shipping-addresses"
//             />
//           </motion.div>

//           <motion.div
//             className="mt-8"
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             transition={{ delay: 0.7 }}
//           >
//             <button
//               type="submit"
//               className="w-full bg-Red text-white py-3 rounded font-medium hover:bg-[#e02d37] transition-colors"
//             >
//               Save Changes
//             </button>
//           </motion.div>
//         </div>
//       </motion.form>
//     </motion.div>
//   );
// };

// export default EditProfile;

import { motion } from "framer-motion";
import { LiaAngleLeftSolid } from "react-icons/lia";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import ProfilePicture from "./ProfilePicture";
import ProfileField from "./ProfileField";
import PhoneInput from "./PhoneInput";
import DatePickerField from "./DatePickerField";
import Button from "../common/Button";

// Validation schema
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  dob: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Invalid date format (MM/DD/YYYY)"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileProps {
  avatar: string;
  showEditProfile: React.Dispatch<React.SetStateAction<boolean>>;
  currentProfile: {
    name: string;
    dob: string;
    email: string;
    phone: string;
  };
}

const EditProfile: React.FC<EditProfileProps> = ({
  avatar,
  showEditProfile,
  currentProfile,
}) => {
  const [countryCode, setCountryCode] = useState("US");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState({
    day: 1,
    month: "January",
    year: 1988,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: currentProfile,
  });

  const onDateSelect = (day: number, month: string, year: number) => {
    setSelectedDate({ day, month, year });
    // Format date as MM/DD/YYYY for form submission
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthNum = months.indexOf(month) + 1;
    const formattedDate = `${monthNum.toString().padStart(2, "0")}/${day
      .toString()
      .padStart(2, "0")}/${year}`;
    setValue("dob", formattedDate);
    setShowDatePicker(false);
  };

  const onSubmit = (data: ProfileFormData) => {
    console.log("Profile data submitted:", data);
    // Future:Here I would update the user profile data through the API
    // On success, navigate back to profile page
    showEditProfile(false);
  };

  return (
    <motion.div
      className="mt-4 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4 mb-8">
        <motion.button
          aria-label="Back to Profile"
          className="hover:opacity-80 transition-opacity"
          transition={{ type: "spring", stiffness: 300 }}
          onClick={() => showEditProfile(false)}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
        >
          <LiaAngleLeftSolid className="text-white text-2xl" />
        </motion.button>
        <h3 className="text-white text-2xl font-semibold">Edit Profile</h3>
      </div>

      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <ProfilePicture avatar={avatar} />

        <div className="space-y-4 mt-6">
          <ProfileField
            label=""
            icon="person"
            placeholder="Full Name"
            register={register("name")}
            error={errors.name?.message}
            delay={0.2}
          />

          <DatePickerField
            register={register("dob")}
            error={errors.dob?.message}
            showDatePicker={showDatePicker}
            setShowDatePicker={setShowDatePicker}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            delay={0.3}
          />

          <ProfileField
            label=""
            icon="email"
            placeholder="Email Address"
            register={register("email")}
            error={errors.email?.message}
            delay={0.4}
          />

          <PhoneInput
            register={register("phone")}
            error={errors.phone?.message}
            countryCode={countryCode}
            setCountryCode={setCountryCode}
            delay={0.5}
          />

          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              title="Shipping Addresses"
              className="flex justify-between items-center w-full bg-[#292B30] border border-white/20 rounded text-white px-6 py-4 transition-colors hover:bg-[#343539]"
              path="/shipping-addresses"
            />
          </motion.div>

          <motion.div
            className="mt-8 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <button
              type="submit"
              className="w-full bg-Red text-white py-3 rounded font-medium hover:bg-[#e02d37] transition-colors"
            >
              Update
            </button>
          </motion.div>
        </div>
      </motion.form>
    </motion.div>
  );
};

export default EditProfile;
