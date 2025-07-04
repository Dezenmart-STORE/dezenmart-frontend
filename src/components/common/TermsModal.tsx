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
            Terms and Conditions
          </h2>
          <p className="text-gray-300 mt-2">
            Please read and accept our terms and conditions to continue using
            our platform.
          </p>
        </div>

        {/* Terms Content */}
        <div
          className="p-6 overflow-y-auto max-h-[60vh] text-gray-300 leading-relaxed"
          onScroll={handleScroll}
        >
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                1. Acceptance of Terms
              </h3>
              <p>
                By accessing and using this platform, you accept and agree to be
                bound by the terms and provision of this agreement. If you do
                not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                2. Use License
              </h3>
              <p>
                Permission is granted to temporarily download one copy of the
                materials on our platform for personal, non-commercial
                transitory viewing only. This is the grant of a license, not a
                transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>modify or copy the materials</li>
                <li>
                  use the materials for any commercial purpose or for any public
                  display
                </li>
                <li>
                  attempt to decompile or reverse engineer any software
                  contained on our platform
                </li>
                <li>
                  remove any copyright or other proprietary notations from the
                  materials
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                3. User Account
              </h3>
              <p>
                When you create an account with us, you must provide information
                that is accurate, complete, and current at all times. You are
                responsible for safeguarding the password and for keeping your
                account information up to date.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                4. Privacy Policy
              </h3>
              <p>
                Your privacy is important to us. Our Privacy Policy explains how
                we collect, use, and protect your information when you use our
                service. By using our service, you agree to the collection and
                use of information in accordance with our Privacy Policy.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                5. Prohibited Uses
              </h3>
              <p>You may not use our platform:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>
                  for any unlawful purpose or to solicit others to perform
                  unlawful acts
                </li>
                <li>
                  to violate any international, federal, provincial, or state
                  regulations, rules, laws, or local ordinances
                </li>
                <li>
                  to infringe upon or violate our intellectual property rights
                  or the intellectual property rights of others
                </li>
                <li>
                  to harass, abuse, insult, harm, defame, slander, disparage,
                  intimidate, or discriminate
                </li>
                <li>to submit false or misleading information</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                6. Disclaimer
              </h3>
              <p>
                The materials on our platform are provided on an 'as is' basis.
                We make no warranties, expressed or implied, and hereby disclaim
                and negate all other warranties including without limitation,
                implied warranties or conditions of merchantability, fitness for
                a particular purpose, or non-infringement of intellectual
                property or other violation of rights.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                7. Limitations
              </h3>
              <p>
                In no event shall our company or its suppliers be liable for any
                damages (including, without limitation, damages for loss of data
                or profit, or due to business interruption) arising out of the
                use or inability to use the materials on our platform, even if
                we or our authorized representative has been notified orally or
                in writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                8. Revisions
              </h3>
              <p>
                We may revise these terms of service at any time without notice.
                By using this platform, you are agreeing to be bound by the then
                current version of these terms of service.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                9. Contact Information
              </h3>
              <p>
                If you have any questions about these Terms and Conditions,
                please contact us through our support channels.
              </p>
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
