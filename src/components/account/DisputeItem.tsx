import { motion } from "framer-motion";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import Button from "../common/Button";
import { FaArrowRightLong } from "react-icons/fa6";

interface DisputeItemProps {
  productImage: string;
  productName: string;
  vendor: string;
  disputeDate: string;
  disputeStatus: string;
}

const DisputeItem: React.FC<DisputeItemProps> = ({
  productImage,
  productName,
  vendor,
  disputeDate,
  disputeStatus,
}) => {
  return (
    <motion.div
      className="grid grid-cols-1 xs:grid-cols-[2fr_3fr] h-full items-center gap-6 md:gap-10 p-6 md:px-[10%] lg:px-[15%] md:py-10 bg-[#292B30] mt-8 rounded-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01 }}
    >
      <motion.img
        src={productImage}
        alt="Product"
        className="w-[60%] md:w-full h-auto mx-auto md:mx-0 rounded-md lg:row-span-2"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300 }}
      />

      <div className="flex flex-col w-full text-left">
        <h3 className="font-normal text-2xl md:text-3xl text-white">
          {productName}
        </h3>
        <span className="flex items-center gap-2 text-sm text-[#AEAEB2] mb-6">
          By {vendor}
          <RiVerifiedBadgeFill className="text-[#4FA3FF] text-xs" />
        </span>

        <div className="flex justify-between text-sm text-white mb-2">
          <span>Dispute Raised:</span>
          <span>{disputeDate}</span>
        </div>
        <div className="flex justify-between text-sm text-white mb-2">
          <span>Dispute Status:</span>
          <span className="px-2 py-1 rounded bg-[#543A2E] text-xs">
            {disputeStatus}
          </span>
        </div>
      </div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className=" text-center xs:col-span-2 mx-auto xs:w-[80%] w-full lg:w-full lg:col-start-2"
      >
        <Button
          title="View Dispute"
          className="flex justify-between items-center w-full bg-Red border-0 rounded text-white px-6 py-2 w-full transition-colors hover:bg-[#e02d37]"
          path=""
          icon={<FaArrowRightLong />}
        />
      </motion.div>
    </motion.div>
  );
};

export default DisputeItem;
