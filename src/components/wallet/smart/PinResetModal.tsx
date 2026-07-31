import { useState } from "react";
import ModalShell from "./ModalShell";
import PinPad from "./PinPad";
import { parseWalletError } from "./walletError";
import { useRequestPinResetOtpMutation, useConfirmPinResetMutation } from "../../../store/api";
import { PIN_LENGTH, PIN_MAX_LENGTH } from "../../../config/smartWallet";

interface Props {
  securityQuestion?: string;
  onClose: () => void;
  onDone: () => void;
}

type Step = "answer" | "otp" | "newpin" | "confirm";

export default function PinResetModal({ securityQuestion, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>("answer");
  const [answer, setAnswer] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [error, setError] = useState("");

  const [requestOtp, { isLoading: requesting }] = useRequestPinResetOtpMutation();
  const [confirmReset, { isLoading: confirming }] = useConfirmPinResetMutation();

  const sendOtp = async () => {
    if (!answer.trim()) { setError("Please enter your security answer."); return; }
    setError("");
    try {
      const res = await requestOtp({ securityAnswer: answer.trim() }).unwrap();
      setMaskedEmail(res.maskedEmail);
      setStep("otp");
    } catch (e) {
      const p = parseWalletError(e, "That answer doesn't match.");
      setError(p.attemptsRemaining != null ? `${p.message} ${p.attemptsRemaining} left.` : p.message);
    }
  };

  const submit = async () => {
    if (confirmPin !== newPin) { setError("Those PINs don't match."); setConfirmPin(""); return; }
    setError("");
    try {
      await confirmReset({ otp, newPin }).unwrap();
      onDone();
    } catch (e) {
      const p = parseWalletError(e, "Invalid or expired code.");
      setError(p.attemptsRemaining != null ? `${p.message} ${p.attemptsRemaining} left.` : p.message);
      setStep("otp");
    }
  };

  const title = step === "answer" ? "Reset your PIN" : step === "otp" ? "Enter the code" : "Set a new PIN";
  const subtitle =
    step === "answer"
      ? securityQuestion || "Answer your security question to continue."
      : step === "otp"
      ? `We sent a 6-digit code to ${maskedEmail || "your email"}.`
      : step === "confirm"
      ? "Re-enter your new PIN."
      : `Choose a new ${PIN_LENGTH}-${PIN_MAX_LENGTH} digit PIN.`;

  return (
    <ModalShell title={title} subtitle={subtitle} onClose={onClose}>
      {step === "answer" && (
        <div className="flex flex-col gap-4">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
            className="w-full rounded-xl bg-[#292B30] px-3 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-red-600"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={sendOtp}
            disabled={requesting}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {requesting ? "Sending code…" : "Send code"}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="flex flex-col gap-4">
          <input
            value={otp}
            inputMode="numeric"
            maxLength={6}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="w-full rounded-xl bg-[#292B30] px-3 py-3 text-center text-lg font-semibold tracking-[0.4em] text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-red-600"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={() => { setError(""); setStep("newpin"); }}
            disabled={otp.length < 6}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {step === "newpin" && (
        <div className="flex flex-col gap-6">
          <PinPad value={newPin} onChange={setNewPin} length={PIN_MAX_LENGTH} maxLength={PIN_MAX_LENGTH} />
          <button
            onClick={() => { setError(""); setStep("confirm"); }}
            disabled={newPin.length < PIN_LENGTH}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div className="flex flex-col gap-6">
          <PinPad value={confirmPin} onChange={setConfirmPin} length={PIN_MAX_LENGTH} maxLength={PIN_MAX_LENGTH} error={!!error} />
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          <button
            onClick={submit}
            disabled={confirmPin.length < PIN_LENGTH || confirming}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {confirming ? "Updating…" : "Reset PIN"}
          </button>
        </div>
      )}
    </ModalShell>
  );
}
