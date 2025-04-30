import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OrderDetails, TradeDetails } from "../../../utils/types";
import { FaCheck, FaStar } from "react-icons/fa";
import { IoChevronBack } from "react-icons/io5";
import { LuMessageSquare } from "react-icons/lu";
import Button from "../../common/Button";
import { useReviewData } from "../../../utils/hooks/useReviewData";

interface CompletedStatusProps {
  orderDetails?: OrderDetails;
  tradeDetails?: TradeDetails;
  onContactBuyer?: () => void;
  //   onViewFAQ?: () => void;
}

const CompletedStatus: FC<CompletedStatusProps> = ({
  orderDetails,
  tradeDetails,
  onContactBuyer,
}) => {
  const details = tradeDetails || (orderDetails as unknown as TradeDetails);
  const [showFaq, setShowFaq] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const { submitReview, loading } = useReviewData();

  if (!details) {
    return <div>Order information not available</div>;
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      alert("Please select a rating");
      return;
    }
    const productId = tradeDetails
      ? details.productId
      : orderDetails?.product?._id || "";
    const orderId = tradeDetails ? details?.orderNo : orderDetails?._id || "";
    await submitReview({
      reviewed: productId,
      order: orderId,
      rating,
      comment,
    });

    setRating(0);
    setComment("");
    setShowReviewForm(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-green-100 text-green-800 p-4 rounded-lg mb-6 flex items-center gap-2"
      >
        <motion.div
          className="bg-green-500 rounded-full p-1 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <FaCheck className="text-white" size={14} />
        </motion.div>
        <span className="font-medium">Your payment is complete</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-neutral-900 text-white p-4 rounded-lg mb-6"
      >
        <div className="flex flex-col gap-4">
          <button
            className="flex items-center text-gray-400 hover:text-white transition-colors"
            onClick={() => window.history.back()}
          >
            <IoChevronBack className="mr-1" />
            Back
          </button>

          <h2 className="text-2xl font-bold">Completed</h2>

          <div className="text-gray-300">
            <p className="mb-2">
              This order has concluded and the assets are no longer locked in
              Desemnart escrow system.
            </p>
            <hr className="my-4 border-gray-700" />
            <p className="text-red-500 font-medium">
              Do not trust strangers or release funds without confirming.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-neutral-900 rounded-lg mb-6"
      >
        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-md">
                  SOLD
                </span>
                <h3 className="text-xl font-bold text-white">
                  {details?.productName}
                </h3>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  title="Contact Buyer"
                  onClick={onContactBuyer}
                  className="bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  icon={<LuMessageSquare />}
                />
              </motion.div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="bg-neutral-800 p-4 rounded-lg">
                <span className="text-gray-400 block mb-1">Amount</span>
                <span className="font-bold text-xl text-red-500">
                  {details?.amount?.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  className="bg-neutral-800 p-3 rounded-lg"
                  whileHover={{ backgroundColor: "rgba(38, 38, 38, 1)" }}
                >
                  <span className="text-gray-400 block text-sm">
                    Total Quantity
                  </span>
                  <span className="font-semibold text-white">
                    {details?.quantity}
                  </span>
                </motion.div>
                <motion.div
                  className="bg-neutral-800 p-3 rounded-lg"
                  whileHover={{ backgroundColor: "rgba(38, 38, 38, 1)" }}
                >
                  <span className="text-gray-400 block text-sm">
                    Order Time
                  </span>
                  <span className="font-semibold text-white">
                    {details?.orderTime}
                  </span>
                </motion.div>
                <motion.div
                  className="bg-neutral-800 p-3 rounded-lg"
                  whileHover={{ backgroundColor: "rgba(38, 38, 38, 1)" }}
                >
                  <span className="text-gray-400 block text-sm">Order No.</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {details?.orderNo}
                    </span>
                    <motion.button
                      onClick={() =>
                        navigator.clipboard.writeText(details?.orderNo || "")
                      }
                      className="text-gray-400 hover:text-white"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FaCheck size={14} />
                    </motion.button>
                  </div>
                </motion.div>
                <motion.div
                  className="bg-neutral-800 p-3 rounded-lg"
                  whileHover={{ backgroundColor: "rgba(38, 38, 38, 1)" }}
                >
                  <span className="text-gray-400 block text-sm">
                    Payment Method
                  </span>
                  <span className="font-semibold text-white">
                    {details?.paymentMethod}
                  </span>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="bg-neutral-900 rounded-lg p-6 mb-6"
      >
        <motion.button
          onClick={() => setShowReviewForm(!showReviewForm)}
          className="flex justify-between items-center w-full text-xl font-bold text-white"
          whileHover={{ color: "#f87171" }}
          transition={{ duration: 0.2 }}
        >
          <span>Leave A Review</span>
          <span>{showReviewForm ? "▲" : "▼"}</span>
        </motion.button>

        <AnimatePresence>
          {showReviewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleReviewSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-gray-300 mb-2">Rating</label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <FaStar
                          size={24}
                          className={`${
                            (hoveredRating || rating) >= star
                              ? "text-yellow-400"
                              : "text-gray-400"
                          } 
                           cursor-pointer`}
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="comment" className="block text-gray-300 mb-2">
                    Comment
                  </label>
                  <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={4}
                    placeholder="Share your experience with this product and seller"
                  />
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    title="Submit Review"
                    type="submit"
                    className={`${
                      loading ? "bg-Red/20" : "bg-Red"
                    } hover:bg-red-600 text-white w-full`}
                  />
                </motion.div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="bg-neutral-900 rounded-lg p-6 mb-6"
      >
        <motion.button
          className="flex justify-between items-center w-full text-xl font-bold text-white"
          onClick={() => setShowFaq(!showFaq)}
          whileHover={{ color: "#f87171" }}
          transition={{ duration: 0.2 }}
        >
          <span>FAQ</span>
          <span>{showFaq ? "▲" : "▼"}</span>
        </motion.button>

        <AnimatePresence>
          {showFaq && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4">
                {[
                  {
                    question: "How do I contact the buyer?",
                    answer:
                      'Click on the "Contact Buyer" button to open a direct messaging channel.',
                  },
                  {
                    question: "When will I receive my payment?",
                    answer:
                      "Payments are typically processed within 24-48 hours after the order is marked as completed.",
                  },
                  {
                    question: "Can I cancel a completed order?",
                    answer:
                      "Once an order is marked as completed, it cannot be canceled. Please contact support if you have any issues.",
                  },
                  {
                    question: "How are reviews used?",
                    answer:
                      "Reviews help build trust in the marketplace. They're displayed on product pages to help buyers make informed decisions.",
                  },
                ].map((faq, index) => (
                  <motion.div
                    key={index}
                    className={`${
                      index < 3 ? "border-b border-neutral-800" : ""
                    } pb-3`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <h4 className="font-medium text-white mb-2">
                      {faq.question}
                    </h4>
                    <p className="text-gray-300">{faq.answer}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          title="Sell more"
          onClick={() => (window.location.href = "/trades")}
          className="bg-red-500 hover:bg-red-600 text-white w-full"
        />
      </motion.div>
    </>
  );
};

export default CompletedStatus;
