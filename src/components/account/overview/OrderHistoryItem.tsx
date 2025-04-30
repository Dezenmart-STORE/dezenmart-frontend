import { motion } from "framer-motion";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import Button from "../../common/Button";
import { FaArrowRightLong } from "react-icons/fa6";
import { Order } from "../../../utils/types";
import { useNavigate } from "react-router-dom";

interface OrderHistoryItemProps extends Order {
  index: number;
  formattedDate: string;
  formattedAmount: string;
}

const OrderHistoryItem: React.FC<OrderHistoryItemProps> = (item) => {
  const navigate = useNavigate();

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "in escrow":
      case "pending":
        return "bg-[#62FF0033]";
      case "shipped":
      case "processing":
        return "bg-[#543A2E]";
      case "completed":
        return "bg-green-800/30";
      case "cancelled":
        return "bg-red-800/30";
      default:
        return "bg-gray-700/30";
    }
  };

  const viewOrderDetails = () => {
    navigate(`/orders/${item._id}`);
  };

  return (
    <motion.div
      className="grid grid-cols-1 xs:grid-cols-[2fr_3fr] h-full items-center gap-6 md:gap-10 p-6 md:px-[10%] lg:px-[15%] md:py-10 bg-[#292B30] mt-8 rounded-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 * item.index }}
      whileHover={{ scale: 1.01 }}
    >
      <motion.img
        src={item.product.images[0]}
        alt={item.product.name}
        className="w-[60%] md:w-full h-auto mx-auto md:mx-0 rounded-md lg:row-span-2 object-cover aspect-square"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300 }}
        loading="lazy"
      />

      <div className="flex flex-col w-full">
        <div className="text-white flex flex-col w-full text-left">
          <h3 className="font-normal text-2xl md:text-3xl truncate">
            {item.product.name}
          </h3>
          <span className="flex items-center gap-2 text-[12px] text-[#AEAEB2]">
            By {item.seller?.name || "Unknown Vendor"}{" "}
            {/* {seller?.verified && ( */}
            <RiVerifiedBadgeFill className="text-[#4FA3FF] text-xs" />
            {/* )} */}
          </span>
          <h6 className="text-[#AEAEB2] text-[12px]">
            {item.quantity || 2} {item.quantity === 1 ? "item" : "items"} @{" "}
            {item.formattedAmount} ETH
          </h6>
        </div>

        <div className="flex flex-col text-white mt-4 md:mt-0">
          <div className="text-sm flex justify-between text-white mb-2">
            <span>Ordered:</span>
            <span>{item.formattedDate}</span>
          </div>
          <div className="text-sm flex justify-between text-white mb-2">
            <span>Status:</span>
            <span className={`p-1 rounded-md ${getStatusStyle(item.status)}`}>
              {item.status}
            </span>
          </div>
        </div>
      </div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        className="text-center xs:col-span-2 mx-auto xs:w-[80%] w-full lg:w-full lg:col-start-2"
      >
        <Button
          title="View Details"
          className="flex justify-between items-center w-full bg-Red border-0 rounded text-white px-8 md:px-14 py-2 mt-4 md:mt-0 transition-colors hover:bg-[#e02d37]"
          onClick={viewOrderDetails}
          icon={<FaArrowRightLong />}
          iconPosition="end"
        />
      </motion.div>
    </motion.div>
  );
};

export default OrderHistoryItem;
