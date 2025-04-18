import { FC } from "react";
import { motion } from "framer-motion";
import { Product } from "../../../utils/types";
import Button from "../../common/Button";
import { FaArrowRightLong } from "react-icons/fa6";
import { MdPending } from "react-icons/md";

interface ActiveTradeCardProps {
  trade: Product;
}

const ActiveTradeCard: FC<ActiveTradeCardProps> = ({ trade }) => {
  return (
    <motion.div
      className="grid grid-cols-1 xs:grid-cols-[2fr_3fr] h-full items-center gap-6 md:gap-10 p-6 md:px-[10%] lg:px-[15%] md:py-10 bg-[#292B30] mt-8 rounded-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{
        scale: 1.01,
        transition: { duration: 0.2 },
      }}
      layout
    >
      <motion.img
        src={trade.image}
        alt={trade.description}
        className="w-[60%] md:w-full h-auto mx-auto md:mx-0 rounded-md lg:row-span-2"
        loading="lazy"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      />

      <div className="flex flex-col w-full text-left">
        <div className="flex justify-between items-center flex-wrap">
          <h3 className="font-normal text-2xl md:text-3xl text-white">
            {trade.name}
          </h3>
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
            <MdPending className="mr-1" /> {trade.status}
          </span>
        </div>

        <p className="text-xl font-bold text-white my-2">{trade.price}</p>

        <div className="flex justify-between text-sm text-white mb-2 flex-wrap">
          <span className="font-semibold">Trading with:</span>
          <span>{trade.seller}</span>
        </div>

        {trade.timeRemaining && (
          <div className="flex justify-between text-sm text-white mb-2 flex-wrap">
            <span className="font-semibold">Time Remaining:</span>
            <motion.span
              className="font-mono bg-[#212428] px-2 py-1 rounded"
              animate={{ color: ["#ffffff", "#ff3b3b", "#ffffff"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {trade.timeRemaining}
            </motion.span>
          </div>
        )}

        <div className="flex justify-between text-sm text-white mb-2 flex-wrap">
          <span className="font-semibold">Quantity:</span>
          <span>{trade.quantity}</span>
        </div>
        <div className="flex justify-between text-sm text-white mb-2 flex-wrap">
          <span className="font-semibold">Min. Cost:</span>
          <span>{trade.minCost}</span>
        </div>
      </div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="text-center xs:col-span-2 mx-auto xs:w-[80%] w-full lg:w-full lg:col-start-2"
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 15,
        }}
      >
        <Button
          title="VIEW DETAILS"
          className="flex justify-between items-center w-full bg-blue-500 border-0 rounded text-white px-6 py-2 w-full transition-colors hover:bg-blue-600"
          path=""
          icon={<FaArrowRightLong />}
        />
      </motion.div>
    </motion.div>
  );
};

export default ActiveTradeCard;
