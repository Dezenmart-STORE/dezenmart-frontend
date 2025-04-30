import { FC, ReactNode, useState } from "react";
import { motion } from "framer-motion";
import {
  OrderDetails,
  TradeDetails,
  TradeTransactionInfo,
} from "../../../utils/types";
import { FaCopy } from "react-icons/fa";
import { LuMessageSquare } from "react-icons/lu";
import Button from "../../common/Button";
import { IoChevronBack } from "react-icons/io5";

interface BaseStatusProps {
  statusTitle: string;
  statusDescription?: string;
  statusAlert?: ReactNode;
  orderDetails?: OrderDetails;
  tradeDetails: TradeDetails;
  transactionInfo: TradeTransactionInfo;
  contactLabel?: string;
  onContact?: () => void;
  actionButtons?: ReactNode;
  showTimer?: boolean;
  timeRemaining?: { minutes: number; seconds: number };
}

const BaseStatus: FC<BaseStatusProps> = ({
  statusTitle,
  statusDescription,
  statusAlert,
  tradeDetails,
  transactionInfo,
  contactLabel = "Contact Seller",
  onContact,
  actionButtons,
  showTimer,
  timeRemaining,
}) => {
  const [copied, setCopied] = useState(false);

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <button
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4 md:mb-0"
            onClick={() => window.history.back()}
          >
            <IoChevronBack className="mr-1" />
            Back
          </button>

          <h2 className="text-2xl font-bold">{statusTitle}</h2>

          {statusDescription && (
            <p className="text-gray-600 text-sm mt-2 md:mt-0">
              {statusDescription}
            </p>
          )}
        </div>

        {showTimer && timeRemaining && (
          <div className="flex justify-between items-center mt-4">
            {onContact && (
              <Button
                title={contactLabel}
                className="bg-transparent hover:bg-gray-700 text-white text-sm px-4 py-2 border border-Red rounded-2xl transition-colors flex items-center gap-x-2 justify-center"
                onClick={onContact}
                icon={<LuMessageSquare className="w-5 h-5 text-Red" />}
                iconPosition="start"
              />
            )}

            <div className="flex items-center gap-1 text-gray-700">
              <span className="text-lg font-bold bg-gray-100 px-2 py-1 rounded">
                {String(timeRemaining.minutes).padStart(2, "0")}
              </span>
              :
              <span className="text-lg font-bold bg-gray-100 px-2 py-1 rounded">
                {String(timeRemaining.seconds).padStart(2, "0")}
              </span>
            </div>
          </div>
        )}

        {!showTimer && onContact && (
          <div className="mt-4">
            <Button
              title={contactLabel}
              className="bg-transparent hover:bg-gray-700 text-white text-sm px-4 py-2 border border-Red rounded-2xl transition-colors flex items-center gap-x-2 justify-center"
              onClick={onContact}
              icon={<LuMessageSquare className="w-5 h-5 text-Red" />}
              iconPosition="start"
            />
          </div>
        )}
      </div>

      {statusAlert && <div className="mb-4">{statusAlert}</div>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">{tradeDetails.productName}</h3>
            <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
              {tradeDetails.tradeType}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-gray-600 block mb-1">Amount</span>
              <span className="font-bold text-xl">
                ${tradeDetails.amount?.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                <span className="text-gray-600">Order No.</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{tradeDetails.orderNo}</span>
                  <motion.button
                    onClick={() => copyOrderId(tradeDetails.orderNo)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FaCopy size={14} />
                  </motion.button>
                </div>
                {copied && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-green-600 absolute bottom-0 right-0 mb-1 mr-1"
                  >
                    Code copied to clipboard!
                  </motion.div>
                )}
              </div>

              {tradeDetails.paymentMethod && (
                <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="font-semibold">
                    {tradeDetails.paymentMethod}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">Transaction Info</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Buyer</span>
            <span className="font-semibold">{transactionInfo.buyerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Rating</span>
            <span className="font-semibold">
              {transactionInfo.goodRating}% Good
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Completed Orders</span>
            <span className="font-semibold">
              {transactionInfo.completedOrders}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Completion Rate</span>
            <span className="font-semibold">
              {transactionInfo.completionRate}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg. Payment Time</span>
            <span className="font-semibold">
              {transactionInfo.avgPaymentTime} mins
            </span>
          </div>
        </div>
      </div>

      {actionButtons && <div className="my-4">{actionButtons}</div>}
    </div>
  );
};

export default BaseStatus;
