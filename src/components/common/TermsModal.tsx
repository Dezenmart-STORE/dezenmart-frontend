import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTerms } from "../../context/TermsContext";
import { useSnackbar } from "../../context/SnackbarContext";
import { useAuth } from "../../context/AuthContext";

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "buyers", label: "Buyers" },
  { id: "vendors", label: "Vendors" },
  { id: "logistics", label: "Logistics" },
  { id: "general", label: "General" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
type Phase = "reading" | "accepting" | "success";

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ label: string; tag?: string }> = ({
  label,
  tag,
}) => (
  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
    {tag && (
      <div className="w-7 h-7 rounded-lg bg-Red/10 border border-Red/20 flex items-center justify-center flex-shrink-0">
        <span className="text-Red text-[11px] font-bold">{tag}</span>
      </div>
    )}
    <h3 className="font-bold text-white text-sm sm:text-base">{label}</h3>
  </div>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="mb-5 last:mb-0">
    <h4 className="text-gray-200 font-semibold text-[13px] sm:text-sm mb-2.5">
      {title}
    </h4>
    {children}
  </div>
);

const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex gap-2.5 items-start">
    <span className="mt-[7px] w-1 h-1 rounded-full bg-gray-500 flex-shrink-0" />
    <span>{children}</span>
  </li>
);

const SuccessScreen: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-fadeIn">
    <div className="relative w-20 h-20 mb-6">
      <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping opacity-40" />
      <div className="relative w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
        <svg
          className="w-9 h-9 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    </div>
    <h3 className="text-xl font-bold text-white mb-2">You're all set!</h3>
    <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
      Terms accepted. Welcome to Dezenmart — your trusted marketplace across
      Africa and beyond.
    </p>
    <div className="flex items-center gap-1.5 mt-6">
      {[0, 150, 300].map((delay) => (
        <div
          key={delay}
          className="w-1 h-1 rounded-full bg-gray-500 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  </div>
);

// ── Main Modal ────────────────────────────────────────────────────────────────

const TermsModal: React.FC = () => {
  const { showTermsModal, acceptTerms, isLoading } = useTerms();
  const { showSnackbar } = useSnackbar();
  const { isAuthenticated } = useAuth();

  const [phase, setPhase] = useState<Phase>("reading");
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionId>("about");

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>(
    {}
  );

  // ── Scroll tracking ─────────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;

      const { scrollTop, scrollHeight, clientHeight } = el;
      const scrollable = scrollHeight - clientHeight;
      const progress =
        scrollable > 0
          ? Math.min(100, Math.round((scrollTop / scrollable) * 100))
          : 100;

      setScrollProgress(progress);
      setHasScrolledToBottom(scrollHeight - scrollTop <= clientHeight + 24);

      // Active section detection
      for (const section of [...SECTIONS].reverse()) {
        const sEl = sectionRefs.current[section.id];
        if (sEl && sEl.offsetTop - scrollTop < 130) {
          setActiveSection(section.id);
          break;
        }
      }
    });
  }, []);

  // ── Jump to section ─────────────────────────────────────────────────────────
  const scrollToSection = useCallback((id: SectionId) => {
    const sEl = sectionRefs.current[id];
    if (sEl && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: sEl.offsetTop - 12,
        behavior: "smooth",
      });
    }
  }, []);

  // ── Accept handler ──────────────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (
      phase !== "reading" ||
      !hasScrolledToBottom ||
      isLoading ||
      !isAuthenticated
    )
      return;

    setPhase("accepting");
    try {
      await acceptTerms();
      setPhase("success");
      showSnackbar("Welcome to Dezenmart!", "success");
    } catch {
      setPhase("reading");
      showSnackbar("Something went wrong. Please try again.", "error");
    }
  }, [
    phase,
    hasScrolledToBottom,
    isLoading,
    isAuthenticated,
    acceptTerms,
    showSnackbar,
  ]);

  // ── Reset on open ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (showTermsModal) {
      setPhase("reading");
      setHasScrolledToBottom(false);
      setScrollProgress(0);
      setActiveSection("about");
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      });
    }
  }, [showTermsModal]);

  // ── Lock body scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showTermsModal) return;
    const sbWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${sbWidth}px`;
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [showTermsModal]);

  // ── Block Escape ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showTermsModal) return;
    const block = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", block, { capture: true, passive: false });
    return () => document.removeEventListener("keydown", block, { capture: true });
  }, [showTermsModal]);

  // ── Cleanup RAF ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!showTermsModal) return null;

  const isButtonDisabled =
    phase !== "reading" ||
    !hasScrolledToBottom ||
    isLoading ||
    !isAuthenticated;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl h-[92vh] sm:h-[88vh] bg-Dark rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/[0.07]">

        {/* Read progress bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] z-20 bg-white/5">
          <div
            className="h-full bg-Red transition-all duration-150 ease-linear"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {phase === "success" ? (
          <SuccessScreen />
        ) : (
          <>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 px-5 sm:px-6 pt-6 pb-4 border-b border-white/[0.07]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-Red/10 border border-Red/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-Red"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                      Terms & Conditions
                    </h2>
                    <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5">
                      Buyers · Vendors · Logistics Partners
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 pt-1">
                  <span
                    className={`text-xs font-semibold tabular-nums transition-colors duration-300 ${
                      scrollProgress === 100
                        ? "text-green-400"
                        : "text-gray-500"
                    }`}
                  >
                    {scrollProgress}%
                  </span>
                </div>
              </div>

              {/* Section navigation */}
              <div className="flex gap-1.5 mt-4 overflow-x-auto hide-scrollbar pb-0.5">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 ${
                      activeSection === s.id
                        ? "bg-Red text-white shadow-sm"
                        : "bg-white/[0.05] text-gray-400 hover:bg-white/10 hover:text-gray-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Scrollable Content ───────────────────────────────────────── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto"
              onScroll={handleScroll}
            >
              <div className="px-5 sm:px-6 py-5 space-y-7 text-gray-400 text-[13px] sm:text-sm leading-relaxed">

                {/* About */}
                <section
                  ref={(el) => {
                    sectionRefs.current["about"] = el;
                  }}
                >
                  <SectionHeader label="About Dezenmart" />
                  <p>
                    Dezenmart is a DeFi-powered e-commerce platform built on
                    the Celo blockchain to deliver trust, transparency, and
                    top-quality products across Africa and beyond. Our escrow
                    system ensures that buyers only release payment after
                    confirming satisfaction — solving the age-old problem of
                    "what I ordered vs. what I got."
                  </p>
                </section>

                {/* Section A: Buyers */}
                <section
                  ref={(el) => {
                    sectionRefs.current["buyers"] = el;
                  }}
                >
                  <SectionHeader label="Buyer Terms" tag="A" />

                  <SubSection title="Buyer Responsibilities & Escrow Release">
                    <ul className="space-y-2.5">
                      <Li>
                        All payments are held in Dezenmart's escrow until you
                        confirm the item received matches your order.
                      </Li>
                      <Li>
                        Once satisfied, approve payment release to the vendor
                        through the platform.
                      </Li>
                      <Li>
                        Rejections must be supported by photo or video evidence
                        within 24 hours of delivery.
                      </Li>
                      <Li>
                        Buyers cannot reject orders without demonstrating a
                        legitimate product defect or misrepresentation.
                      </Li>
                    </ul>
                  </SubSection>

                  <SubSection title="Pickup & Delivery Window">
                    <ul className="space-y-2.5">
                      <Li>
                        All orders are delivered via Dezenmart's verified
                        logistics partners to your provided address.
                      </Li>
                      <li className="flex gap-2.5 items-start">
                        <span className="mt-[7px] w-1 h-1 rounded-full bg-gray-500 flex-shrink-0" />
                        <span>
                          If a product has a pickup option, it must be collected
                          within 48 hours of notification.{" "}
                          <span className="text-red-400 font-medium">
                            Failure to do so may result in cancellation and loss
                            of refund rights.
                          </span>
                        </span>
                      </li>
                    </ul>
                  </SubSection>

                  <SubSection title="Refunds & Complaints">
                    <p className="mb-3">
                      Refunds via escrow are available when all of the following
                      conditions are met:
                    </p>
                    <ol className="space-y-1.5 list-decimal ml-5 mb-4 marker:text-gray-500">
                      <li>
                        The issue is reported within 24 hours of receiving the
                        item.
                      </li>
                      <li>
                        You provide clear photo or video evidence of the defect.
                      </li>
                      <li>
                        Failure to provide evidence attracts a 10% deduction
                        from the refund.
                      </li>
                    </ol>
                    <div className="bg-red-500/[0.06] border border-red-500/20 rounded-xl p-4">
                      <p className="text-red-400 text-[11px] font-semibold uppercase tracking-wide mb-2">
                        Important
                      </p>
                      <ul className="space-y-2">
                        <Li>
                          Once you approve a product and payment is released,
                          Dezenmart will not be liable for any further
                          complaints.
                        </Li>
                        <Li>
                          All post-payment issues must be directed to the
                          seller.
                        </Li>
                      </ul>
                    </div>
                  </SubSection>
                </section>

                {/* Section B: Vendors */}
                <section
                  ref={(el) => {
                    sectionRefs.current["vendors"] = el;
                  }}
                >
                  <SectionHeader label="Vendor Terms" tag="B" />

                  <SubSection title="Registration & Responsibility">
                    <ul className="space-y-2.5">
                      <Li>
                        Vendors must register with valid business information
                        and connect a verified wallet to receive stablecoin
                        payments.
                      </Li>
                      <Li>
                        Listings must be accurate and include: product images,
                        specs, pricing (USD equivalent), description, and
                        delivery timelines.
                      </Li>
                    </ul>
                  </SubSection>

                  <SubSection title="Fulfillment & Quality Control">
                    <ul className="space-y-2.5">
                      <Li>
                        Vendors are responsible for timely and quality
                        fulfillment of all orders.
                      </Li>
                      <Li>
                        Payment will not be released until the buyer confirms
                        the item meets their expectations.
                      </Li>
                      <Li>
                        Confirmed refunds due to poor quality or
                        misrepresentation may be deducted from your escrow
                        balance.
                      </Li>
                    </ul>
                  </SubSection>

                  <SubSection title="Earnings & Payouts">
                    <ul className="space-y-2.5">
                      <Li>
                        Payouts are settled in stablecoins (e.g., cUSD)
                        directly to your wallet after buyer approval.
                      </Li>
                      <Li>
                        Vendors are expected to respond to disputes promptly
                        and cooperate in resolutions.
                      </Li>
                    </ul>
                  </SubSection>

                  <SubSection title="Policy Violations">
                    <ul className="space-y-2.5">
                      <Li>
                        Fake, substandard, or misleading listings will result
                        in delisting and possible suspension.
                      </Li>
                      <Li>
                        Vendors must not attempt to bypass Dezenmart's escrow
                        model.
                      </Li>
                    </ul>
                  </SubSection>
                </section>

                {/* Section C: Logistics */}
                <section
                  ref={(el) => {
                    sectionRefs.current["logistics"] = el;
                  }}
                >
                  <SectionHeader label="Logistics Partner Terms" tag="C" />

                  <SubSection title="Delivery Obligations">
                    <ul className="space-y-2.5">
                      <Li>
                        Logistics partners are responsible for safe, timely,
                        and accurate deliveries.
                      </Li>
                      <Li>
                        All orders must be delivered within 48 hours of vendor
                        fulfillment notification, unless stated otherwise.
                      </Li>
                    </ul>
                  </SubSection>

                  <SubSection title="Handling & Responsibility">
                    <ul className="space-y-2.5">
                      <Li>
                        If damage occurs during transit, the logistics provider
                        may be held partially or fully accountable after
                        investigation.
                      </Li>
                      <Li>
                        Delivery completion must be updated in real-time via
                        Dezenmart's logistics dashboard or partner portal.
                      </Li>
                    </ul>
                  </SubSection>

                  <SubSection title="Payouts">
                    <ul className="space-y-2.5">
                      <Li>
                        Delivery fees are settled in stablecoins upon
                        confirmation of successful delivery.
                      </Li>
                      <Li>
                        Repeated late deliveries or complaints may affect your
                        status as a verified logistics partner.
                      </Li>
                    </ul>
                  </SubSection>
                </section>

                {/* Section D: General */}
                <section
                  ref={(el) => {
                    sectionRefs.current["general"] = el;
                  }}
                >
                  <SectionHeader label="General Provisions" tag="D" />

                  <SubSection title="Platform Protection & Escrow">
                    <ul className="space-y-2.5">
                      <Li>
                        Dezenmart is a non-custodial platform. Funds are held
                        in smart contract-powered escrow for buyer protection
                        and fair vendor payout.
                      </Li>
                      <Li>
                        All participants agree to act in good faith and follow
                        the dispute resolution process where applicable.
                      </Li>
                    </ul>
                  </SubSection>

                  <SubSection title="Early Supporter Program">
                    <p>
                      Buyers, Vendors, and Logistics Partners who join
                      Dezenmart in its early phase will earn Dezenmart
                      Supporter Points (DSPs) — a utility-based reputation and
                      reward system that unlocks future perks, visibility, and
                      platform privileges.
                    </p>
                  </SubSection>

                  <SubSection title="Contact & Dispute Resolution">
                    <p className="mb-3">
                      For questions, support, or to initiate a dispute:
                    </p>
                    <div className="space-y-2">
                      <a
                        href="mailto:support@dezenmart.com"
                        className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors group w-fit"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-white/10 border border-white/[0.06] flex items-center justify-center transition-colors">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        support@dezenmart.com
                      </a>
                      <a
                        href="https://dezenmart.netlify.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors group w-fit"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-white/10 border border-white/[0.06] flex items-center justify-center transition-colors">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                          </svg>
                        </div>
                        dezenmart.netlify.app
                      </a>
                    </div>
                  </SubSection>
                </section>

                <div className="h-2" />
              </div>
            </div>

            {/* ── Scroll hint ──────────────────────────────────────────────── */}
            {!hasScrolledToBottom && (
              <div className="absolute bottom-[76px] sm:bottom-[84px] inset-x-0 flex justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-1 animate-bounce opacity-60">
                  <span className="text-[10px] text-gray-400 font-medium">
                    Keep scrolling
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-white/[0.07] bg-Dark">
              {hasScrolledToBottom && (
                <div className="flex items-center gap-2.5 mb-3 animate-fadeIn">
                  <div className="w-4 h-4 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-2.5 h-2.5 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-300 text-xs sm:text-sm">
                    I have read and agree to the Terms and Conditions
                  </span>
                </div>
              )}

              <button
                onClick={handleAccept}
                disabled={isButtonDisabled}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  isButtonDisabled
                    ? "bg-white/[0.04] text-gray-500 cursor-not-allowed border border-white/[0.05]"
                    : "bg-Red hover:bg-red-500 text-white active:scale-[0.98] shadow-lg shadow-Red/20"
                }`}
              >
                {phase === "accepting" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Accepting...
                  </span>
                ) : hasScrolledToBottom ? (
                  "Accept & Continue"
                ) : (
                  "Scroll down to continue"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TermsModal;
