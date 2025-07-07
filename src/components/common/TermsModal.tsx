import React, { useState, useEffect } from "react";
import { useTerms } from "../../context/TermsContext";
import { useSnackbar } from "../../context/SnackbarContext";

const TermsModal: React.FC = () => {
  const { showTermsModal, acceptTerms, isLoading } = useTerms();
  const { showSnackbar } = useSnackbar();
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isScrolledToBottom =
      element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    setHasScrolledToBottom(isScrolledToBottom);
  };

  const handleAccept = async () => {
    if (isLoading || isAccepting) return;

    setIsAccepting(true);
    try {
      await acceptTerms();
      showSnackbar("Terms and conditions accepted successfully", "success");
    } catch (error) {
      showSnackbar("Failed to accept terms and conditions", "error");
    } finally {
      setIsAccepting(false);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showTermsModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showTermsModal]);

  // Prevent closing modal with escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showTermsModal) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (showTermsModal) {
      document.addEventListener("keydown", handleKeyDown, true);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [showTermsModal]);

  if (!showTermsModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="relative w-full max-w-7xl max-h-[90vh] bg-[#292B30] rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#292B30] border-b border-gray-600 p-6">
          <h2 className="text-2xl font-bold text-white">
            📜 Dezenmart Terms & Conditions
          </h2>
          <p className="text-gray-300 mt-2">
            For Buyers, Vendors & Logistics Partners
          </p>
        </div>

        {/* Terms Content */}
        <div
          className="p-6 overflow-y-auto max-h-[60vh] text-gray-300 leading-relaxed"
          onScroll={handleScroll}
        >
          <div className="space-y-6">
            {/* About Dezenmart */}
            <section>
              <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                👑 About Dezenmart
              </h3>
              <p>
                Dezenmart is a DeFi-powered e-commerce platform built on
                blockchain to deliver trust, transparency, and top-quality
                products across Africa and beyond. Our escrow system ensures
                that buyers only release payment after confirming satisfaction,
                thereby solving the all-too-common issue of "what I ordered vs.
                what I got."
              </p>
            </section>

            {/* Section A: Buyer Terms */}
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                SECTION A: BUYER TERMS
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    🛍 Buyer Responsibilities & Escrow Release
                  </h4>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      All payments are held in Dezenmart's escrow until you
                      confirm that the item received matches the order.
                    </li>
                    <li>
                      Once you inspect and are satisfied, kindly leave a message
                      approving payment release to the vendor.
                    </li>
                    <li>
                      Rejections must be based on valid issues and supported by
                      photo or video evidence within 24 hours of delivery.
                    </li>
                    <li>
                      Buyers cannot reject orders without clearly demonstrating
                      a legitimate product defect or misrepresentation.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    🚚 Pickup & Delivery Window
                  </h4>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      By default, all orders are delivered via Dezenmart's
                      verified logistics partners to your provided address.
                    </li>
                    <li>
                      If a product has a pickup option, it must be collected
                      within 48 hours of notification.
                      <span className="text-red-400 font-semibold">
                        {" "}
                        🚨 Failure to do so may result in cancellation and loss
                        of refund rights.
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    🔁 Refunds & Complaints
                  </h4>
                  <p className="mb-2">
                    If you are not satisfied with your purchase, Dezenmart
                    offers a hassle-free refund via escrow—provided the
                    following conditions are met:
                  </p>
                  <ol className="list-decimal ml-6 space-y-1 mb-3">
                    <li>
                      The issue is reported within 24 hours of receiving the
                      item.
                    </li>
                    <li>
                      You provide clear photo or video evidence of the defect.
                    </li>
                    <li>
                      Note: Failure to provide evidence attracts a 10% deduction
                      from the refund.
                    </li>
                  </ol>
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mt-3">
                    <p className="text-red-300">
                      <strong>Important:</strong> After you approve the product
                      and payment is released:
                    </p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      <li>Dezenmart will not be liable for any complaints.</li>
                      <li>
                        All post-payment issues must be directed to the seller.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section B: Vendor Terms */}
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                SECTION B: VENDOR TERMS
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    🛒 Vendor Registration & Responsibility
                  </h4>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      Vendors must register with valid business information and
                      connect a verified wallet to receive stablecoin payments.
                    </li>
                    <li>
                      Listings must be accurate, truthful, and include: product
                      images, specs, pricing (USD equivalent), description and
                      delivery timelines.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    📦 Fulfillment & Quality Control
                  </h4>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      Vendors are responsible for timely and quality fulfillment
                      of orders.
                    </li>
                    <li>
                      Payment will not be released until the buyer confirms the
                      item meets their expectations.
                    </li>
                    <li>
                      Any confirmed refunds due to poor quality,
                      misrepresentation, or failed delivery may be deducted from
                      your escrow balance.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    💼 Earnings & Payouts
                  </h4>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      Payouts are settled in stablecoins (e.g., cUSD) directly
                      to your wallet after buyer approval.
                    </li>
                    <li>
                      Vendors are expected to respond to disputes promptly and
                      cooperate in resolutions.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    🚫 Policy Violations
                  </h4>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      Fake, substandard, or misleading product listings will
                      result in delisting and possible suspension.
                    </li>
                    <li>
                      Vendors must not attempt to bypass Dezenmart's escrow
                      model.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section C: Logistics Partner Terms */}
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                SECTION C: LOGISTICS PARTNER TERMS
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    🚚 Delivery Obligations
                  </h4>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      Dezenmart logistics partners are responsible for safe,
                      timely, and accurate deliveries.
                    </li>
                    <li>
                      All orders must be delivered within 48 hours of vendor
                      fulfillment notification, unless stated otherwise.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    🛡 Handling & Responsibility
                  </h4>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      If damage occurs during transit, the logistics provider
                      may be held partially or fully accountable after
                      investigation.
                    </li>
                    <li>
                      Delivery completion must be updated in real-time via
                      Dezenmart's logistics dashboard or partner portal.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    💰 Payouts
                  </h4>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      Delivery fees are settled in stablecoins upon confirmation
                      of successful delivery.
                    </li>
                    <li>
                      Repeated late deliveries or complaints may affect your
                      status as a verified logistics partner.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section D: General Provisions */}
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                SECTION D: GENERAL PROVISIONS
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    ⚖ Platform Protection & Escrow Function
                  </h4>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      Dezenmart is a non-custodial platform. Funds are held in
                      smart contract-powered escrow for buyer protection and
                      fair vendor payout.
                    </li>
                    <li>
                      All participants agree to act in good faith and follow the
                      dispute resolution process where applicable.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    ✨ Early Supporter Program
                  </h4>
                  <p>
                    Buyers, Vendors, and Logistics Partners who join Dezenmart
                    in its early phase will earn Dezenmart Supporter Points
                    (DSPs) — a utility-based reputation and reward system that
                    will unlock future perks, visibility, and platform
                    privileges.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    📬 Contact & Dispute Resolution
                  </h4>
                  <p className="mb-2">
                    For questions, support, or to initiate a dispute:
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>📩 support@dezenmart.com</li>
                    <li>
                      🌐{" "}
                      <a
                        href="https://dezenmart.netlify.app"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        https://dezenmart.netlify.app
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Scroll Indicator */}
        {!hasScrolledToBottom && (
          <div className="sticky bottom-20 left-0 right-0 flex justify-center">
            <div className="bg-Red text-white px-4 py-2 rounded-full text-sm animate-pulse">
              Please scroll down to read all terms
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#292B30] border-t border-gray-600 p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={hasScrolledToBottom}
                onChange={() => {}}
                className="w-5 h-5 text-Red bg-gray-700 border-gray-600 rounded focus:ring-Red focus:ring-2"
                disabled={!hasScrolledToBottom}
              />
              <label htmlFor="terms-checkbox" className="text-gray-300">
                I have read and agree to the Terms and Conditions
              </label>
            </div>

            <button
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || isLoading || isAccepting}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-300 ${
                !hasScrolledToBottom || isLoading || isAccepting
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-Red hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {isAccepting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Accepting...</span>
                </div>
              ) : (
                "Accept Terms and Conditions"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
