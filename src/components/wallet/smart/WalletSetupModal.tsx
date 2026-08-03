import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useConnectWithOtp, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import {
  RiShieldKeyholeLine,
  RiMailCheckLine,
  RiCheckLine,
  RiLoader4Line,
  RiErrorWarningLine,
} from "react-icons/ri";
import ModalShell from "./ModalShell";

interface Props {
  /** The signed-in user's email (from Google). Prefilled, never typed. */
  email: string | null | undefined;
  /** "setup" for a brand-new wallet, "reconnect" for a returning user whose
   *  wallet already exists on the backend. */
  mode?: "setup" | "reconnect";
  /** The existing wallet address (reconnect mode) to reassure the user. */
  walletAddress?: string | null;
  onClose: () => void;
}

type Step =
  | "intro"
  | "connecting"
  | "reconnect"
  | "sending"
  | "code"
  | "verifying"
  | "success"
  | "error";

const OTP_LEN = 6;

const maskEmail = (email: string): string => {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const head = name.slice(0, 1);
  return `${head}${"•".repeat(Math.max(3, name.length - 1))}@${domain}`;
};

const shortAddr = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

/**
 * "Confirm it's you" wallet-setup flow. We already know the user (Google), so
 * this is framed as securing THEIR wallet - not another sign-in. Dynamic emails
 * a code to their known address; verifying it provisions the embedded wallet.
 */
export default function WalletSetupModal({ email, mode = "setup", walletAddress, onClose }: Props) {
  const { connectWithEmail, verifyOneTimePassword, retryOneTimePassword } = useConnectWithOtp();
  const { user, sdkHasLoaded } = useDynamicContext();
  const isReconnect = mode === "reconnect";

  const [step, setStep] = useState<Step>(isReconnect ? "connecting" : "intro");
  const [error, setError] = useState<string>("");
  const [resent, setResent] = useState(false);

  const masked = useMemo(() => (email ? maskEmail(email) : "your email"), [email]);
  const addr = shortAddr(walletAddress);

  // Setup mode: if a Dynamic session already exists there's nothing to confirm.
  useEffect(() => {
    if (!isReconnect && user) onClose();
  }, [isReconnect, user, onClose]);

  // Reconnect mode: once the SDK has loaded, decide. If the session
  // auto-restored (same device) we're already connected -> brief confirmation.
  // Otherwise we need a code to reconnect on this device.
  const decided = useRef(false);
  useEffect(() => {
    if (!isReconnect || !sdkHasLoaded || decided.current) return;
    decided.current = true;
    if (user) {
      setStep("success");
      setTimeout(onClose, 1600);
    } else {
      setStep("reconnect");
    }
  }, [isReconnect, sdkHasLoaded, user, onClose]);

  // If the Dynamic session appears mid-reconnect (auto-restore raced us), close.
  useEffect(() => {
    if (isReconnect && user && (step === "reconnect" || step === "connecting")) {
      setStep("success");
      setTimeout(onClose, 1600);
    }
  }, [isReconnect, user, step, onClose]);

  const sendCode = async () => {
    if (!email) {
      setError("We couldn't find your email. Please sign in again.");
      setStep("error");
      return;
    }
    setStep("sending");
    setError("");
    try {
      await connectWithEmail(email);
      setStep("code");
    } catch {
      setError("We couldn't send the code. Check your connection and try again.");
      setStep("error");
    }
  };

  const verify = async (code: string) => {
    setStep("verifying");
    setError("");
    try {
      await verifyOneTimePassword(code);
      setStep("success");
      // Give the success state a beat to read (it mentions they can switch to
      // their own wallet), then hand back. The bridge links the new wallet to
      // the backend in the background.
      setTimeout(onClose, 3200);
    } catch {
      setError("That code didn't match. Please check it and try again.");
      setStep("code");
    }
  };

  const resend = async () => {
    try {
      await retryOneTimePassword();
      setResent(true);
      setTimeout(() => setResent(false), 2500);
    } catch {
      /* surface nothing - the code screen stays usable */
    }
  };

  // ---- Intro: benefit + reassurance, single tap to start ----
  if (step === "intro") {
    return (
      <ModalShell
        title="Secure your wallet"
        subtitle="Your DezenMart wallet lets you pay and get paid in crypto. Let's confirm it's you so only you can access it."
        dismissible
        onClose={onClose}
        footer={
          <button
            onClick={sendCode}
            disabled={!sdkHasLoaded}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            Send confirmation code
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          <Hero icon={<RiShieldKeyholeLine />} />
          <Point text={`We'll email a 6-digit code to ${masked}.`} />
          <Point text="It takes a few seconds and keeps your funds protected." />
          <Point text="No new password to remember." />
        </div>
      </ModalShell>
    );
  }

  // ---- Reconnect: brief "connecting" while Dynamic tries to auto-restore ----
  if (step === "connecting") {
    return (
      <ModalShell title="Connecting your wallet" dismissible={false}>
        <Centered>
          <RiLoader4Line className="animate-spin text-2xl text-red-500" />
          <p className="text-sm text-gray-300">Reconnecting to your Dezen Wallet…</p>
          {addr && <p className="font-mono text-xs text-gray-500">{addr}</p>}
        </Centered>
      </ModalShell>
    );
  }

  // ---- Reconnect: needs a code on this device ----
  if (step === "reconnect") {
    return (
      <ModalShell
        title="Welcome back"
        subtitle="Confirm it's you to reconnect to your existing Dezen Wallet on this device."
        dismissible
        onClose={onClose}
        footer={
          <button
            onClick={sendCode}
            disabled={!sdkHasLoaded}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            Send confirmation code
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          <Hero icon={<RiShieldKeyholeLine />} />
          {addr && (
            <div className="flex items-center justify-between rounded-xl bg-[#292B30] px-3 py-2.5">
              <span className="text-xs text-gray-500">Your wallet</span>
              <span className="font-mono text-sm text-white">{addr}</span>
            </div>
          )}
          <Point text={`We'll email a 6-digit code to ${masked} to confirm it's you.`} />
          <Point text="Your funds and history stay exactly where they were." />
        </div>
      </ModalShell>
    );
  }

  if (step === "sending") {
    return (
      <ModalShell title="Sending your code" dismissible={false}>
        <Centered>
          <RiLoader4Line className="animate-spin text-2xl text-red-500" />
          <p className="text-sm text-gray-400">Emailing a code to {masked}…</p>
        </Centered>
      </ModalShell>
    );
  }

  if (step === "code") {
    return (
      <ModalShell
        title="Confirm it's you"
        subtitle={`Enter the 6-digit code we sent to ${masked} to ${isReconnect ? "reconnect your wallet" : "finish securing your wallet"}.`}
        dismissible
        onClose={onClose}
      >
        <OtpInput onComplete={verify} />
        {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}
        <div className="mt-4 text-center text-xs text-gray-500">
          {resent ? (
            <span className="text-green-400">Code resent</span>
          ) : (
            <>
              Didn't get it?{" "}
              <button onClick={resend} className="font-medium text-red-400 hover:text-red-300">
                Resend
              </button>
            </>
          )}
        </div>
      </ModalShell>
    );
  }

  if (step === "verifying") {
    return (
      <ModalShell title="Securing your wallet" dismissible={false}>
        <Centered>
          <RiLoader4Line className="animate-spin text-2xl text-red-500" />
          <p className="text-sm text-gray-400">Setting up your secure wallet…</p>
        </Centered>
      </ModalShell>
    );
  }

  if (step === "success") {
    return (
      <ModalShell title={isReconnect ? "Reconnected" : "You're all set"} dismissible={false}>
        <Centered>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
            <RiCheckLine className="text-3xl text-green-400" />
          </div>
          {isReconnect ? (
            <>
              <p className="text-sm text-gray-300">You're back in your Dezen Wallet.</p>
              {addr && <p className="font-mono text-xs text-gray-500">{addr}</p>}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-300">Your wallet is ready. You can now pay and get paid on DezenMart.</p>
              <p className="text-xs text-gray-500">
                Prefer your own wallet? You can disconnect and connect MetaMask, Coinbase, Trust, or Valora any time. It's up to you.
              </p>
            </>
          )}
        </Centered>
      </ModalShell>
    );
  }

  // error
  return (
    <ModalShell
      title="Something went wrong"
      dismissible
      onClose={onClose}
      footer={
        <button
          onClick={sendCode}
          className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700"
        >
          Try again
        </button>
      }
    >
      <Centered>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
          <RiErrorWarningLine className="text-2xl text-red-400" />
        </div>
        <p className="text-sm text-gray-400">{error || "Please try again."}</p>
      </Centered>
    </ModalShell>
  );
}

// ---------- Bits ----------

function Hero({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="mb-1 flex justify-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/15 text-3xl text-red-500">
        {icon}
      </div>
    </div>
  );
}

function Point({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <RiMailCheckLine className="mt-0.5 flex-shrink-0 text-green-400" />
      <p className="text-sm text-gray-300">{text}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-4 py-6 text-center">{children}</div>;
}

/** 6-box code input: auto-advance, backspace, and paste of the whole code. */
function OtpInput({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LEN).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const commit = (next: string[]) => {
    setDigits(next);
    const code = next.join("");
    if (code.length === OTP_LEN && next.every((d) => d !== "")) onComplete(code);
  };

  const setAt = (i: number, val: string) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    commit(next);
    if (clean && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
    if (!pasted) return;
    const next = Array(OTP_LEN).fill("");
    pasted.split("").forEach((d, idx) => (next[idx] = d));
    commit(next);
    refs.current[Math.min(pasted.length, OTP_LEN - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2" onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => setAt(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          className="h-12 w-11 rounded-xl border border-[#2F3136] bg-[#111316] text-center text-lg font-bold text-white outline-none transition-colors focus:border-red-500"
        />
      ))}
    </div>
  );
}
