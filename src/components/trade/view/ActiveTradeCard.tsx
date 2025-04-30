import {
  // FC,
  useState,
} from "react";
import { motion } from "framer-motion";
// import { Product } from "../../../utils/types";
import Button from "../../common/Button";
import TradeCardBase from "./TradeCardBase";
import TradeDetailRow from "./TradeDetailRow";
import { FaCopy } from "react-icons/fa";
import { LuMessageSquare } from "react-icons/lu";

// interface ActiveTradeCardProps {
//   trade: Product;
// }

const ActiveTradeCard = () => {
  const [copied, setCopied] = useState(false);
  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <TradeCardBase className="mt-8 px-6 md:px-12 py-2">
      <div className="py-4 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="w-fit flex flex-col gap-2">
          <div className="w-full flex gap-4">
            <motion.h3
              className="font-medium text-xl text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              IPHONE 16
            </motion.h3>
            <motion.span
              className="bg-red-500 text-white text-xs px-3 py-1 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              SELL
            </motion.span>
          </div>
          <span className="text-gray-400 text-sm">2025-01-24 10:34:22</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            title="Contact Seller"
            className="bg-transparent hover:bg-gray-700 text-white text-sm px-4 py-2 border border-Red rounded-2xl transition-colors flex items-center gap-x-2 justify-center"
            path=""
            icon={<LuMessageSquare className="w-5 h-5 text-Red" />}
            iconPosition="start"
          />
        </motion.div>
      </div>

      <div className="border-t border-gray-700 py-10">
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Amount</span>
            <span className="text-red-500 text-xl font-bold">1,600,000</span>
          </div>

          <div className="space-y-2">
            <TradeDetailRow label="Total Quatity" value="2" />
            <TradeDetailRow label="Order Time" value="2025-01-24 10:34:22" />
            <TradeDetailRow
              label="Order No."
              value={
                <div className="flex items-center">
                  <span className="mr-2">23435461580011</span>
                  <motion.button
                    onClick={() => copyOrderId("23435461580011")}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FaCopy className="text-gray-400 hover:text-white transition-colors" />
                  </motion.button>
                </div>
              }
              bottomNote={
                copied && (
                  <motion.p
                    className="text-green-400 text-center mt-2 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Code copied to clipboard!
                  </motion.p>
                )
              }
            />
          </div>
        </motion.div>
      </div>
    </TradeCardBase>
  );
};
export default ActiveTradeCard;
