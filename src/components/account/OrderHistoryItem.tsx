import { motion } from "framer-motion";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import Button from "../common/Button";
import { FaArrowRightLong } from "react-icons/fa6";

interface OrderHistoryItemProps {
  productImage: string;
  productName: string;
  vendor: string;
  quantity: number;
  price: string;
  orderDate: string;
  status: "In Escrow" | "Shipped";
  index: number;
}

const OrderHistoryItem: React.FC<OrderHistoryItemProps> = ({
  productImage,
  productName,
  vendor,
  quantity,
  price,
  orderDate,
  status,
  index,
}) => {
  return (
    <motion.div
      className="grid grid-cols-1 xs:grid-cols-[2fr_3fr] h-full items-center gap-6 md:gap-10 p-6 md:px-[10%] lg:px-[15%] md:py-10 bg-[#292B30] mt-8 rounded-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 * index }}
      whileHover={{ scale: 1.01 }}
    >
      <motion.img
        src={productImage}
        alt="Product"
        className="w-[60%] md:w-full h-auto mx-auto md:mx-0 rounded-md lg:row-span-2"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300 }}
      />
      <div className="flex flex-col w-full">
        <div className="text-white flex flex-col w-full text-left">
          <h3 className="font-normal text-2xl md:text-3xl">{productName}</h3>
          <span className="flex items-center gap-2 text-[12px] text-[#AEAEB2]">
            By {vendor}{" "}
            <RiVerifiedBadgeFill className="text-[#4FA3FF] text-xs" />
          </span>
          <h6 className="text-[#AEAEB2] text-[12px]">
            {quantity} items Bought @{price} ETH
          </h6>
        </div>
        <div className="flex flex-col text-white mt-4 md:mt-0">
          <div className="text-sm flex justify-between text-white mb-2">
            <span>Ordered:</span>
            <span>{orderDate}</span>
          </div>
          <div className="text-sm flex justify-between text-white mb-2">
            <span>Status:</span>
            <span
              className={`p-1 rounded-md ${
                status === "In Escrow" ? "bg-[#62FF0033]" : "bg-[#543A2E]"
              }`}
            >
              {status}
            </span>
          </div>
        </div>
      </div>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className=" text-center xs:col-span-2 mx-auto xs:w-[80%] w-full lg:w-full lg:col-start-2"
      >
        <Button
          title="View Details"
          className="flex justify-between items-center w-full bg-Red border-0 rounded text-white px-8 md:px-14 py-2 mt-4 md:mt-0 transition-colors hover:bg-[#e02d37]"
          path=""
          icon={<FaArrowRightLong />}
        />
      </motion.div>
    </motion.div>
  );
};

export default OrderHistoryItem;
