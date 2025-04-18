import { FC } from "react";
import { motion } from "framer-motion";
import { Product } from "../../../utils/types";
import Button from "../../common/Button";
import { FaArrowRightLong } from "react-icons/fa6";
interface CompletedTradeCardProps {
  trade: Product;
}

const CompletedTradeCard: FC<CompletedTradeCardProps> = ({ trade }) => {
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
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
            {trade.status}
          </span>
        </div>

        <p className="text-xl font-bold text-white my-2">{trade.price}</p>

        <div className="flex justify-between text-sm text-white mb-2 flex-wrap">
          <span className="font-semibold">Trading Partner:</span>
          <span>{trade.seller}</span>
        </div>

        <div className="flex justify-between text-sm text-white mb-2 flex-wrap">
          <span className="font-semibold">Payment Status:</span>
          <span className="text-green-400">{trade.paymentStatus}</span>
        </div>

        <div className="flex justify-between text-sm text-white mb-2 flex-wrap">
          <span className="font-semibold">Escrow Status:</span>
          <span className="text-green-400">{trade.escrowStatus}</span>
        </div>

        <div className="flex justify-between text-sm text-white mb-2 flex-wrap">
          <span className="font-semibold">Quantity:</span>
          <span>{trade.quantity}</span>
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
          title="VIEW RECEIPT"
          className="flex justify-between items-center w-full bg-green-600 border-0 rounded text-white px-6 py-2 w-full transition-colors hover:bg-green-700"
          path=""
          icon={<FaArrowRightLong />}
        />
      </motion.div>
    </motion.div>
  );
};

export default CompletedTradeCard;
