import { useState } from "react";
import ModalShell from "./ModalShell";
import PinPad from "./PinPad";
import { parseWalletError } from "./walletError";
import { useSetWalletPinMutation } from "../../../store/api";
import { PIN_LENGTH, PIN_MAX_LENGTH, SECURITY_QUESTIONS } from "../../../config/smartWallet";
import type { SmartWalletPhase } from "../../../context/SmartWalletContext";

interface Props {
  phase: SmartWalletPhase;
  securityQuestion?: string;
  onClose: () => void;
  onDone: () => void;
}

type Step = "pin" | "confirm" | "security";

export default function WalletOnboardingModal({ phase, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [question, setQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const [setWalletPin, { isLoading }] = useSetWalletPinMutation();

  const isSetup = phase === "needs-setup";
  const pinValid = pin.length >= PIN_LENGTH && pin.length <= PIN_MAX_LENGTH;

  const goConfirm = () => {
    if (!pinValid) return;
    setError("");
    setStep("confirm");
  };

  const goSecurity = () => {
    if (confirmPin !== pin) {
      setError("Those PINs don't match. Try again.");
      setConfirmPin("");
      return;
    }
    setError("");
    setStep("security");
  };

  const submit = async () => {
    if (!answer.trim()) {
      setError("Please answer your security question.");
      return;
    }
    setError("");
    try {
      await setWalletPin({ pin, securityQuestion: question, securityAnswer: answer.trim() }).unwrap();
      onDone();
    } catch (e) {
      setError(parseWalletError(e, "We couldn't set your PIN. Please try again.").message);
    }
  };

  const title =
    step === "security"
      ? "Security question"
      : isSetup
      ? "Set up your wallet"
      : "Set your wallet PIN";

  const subtitle =
    step === "pin"
      ? isSetup
        ? "Your DezenMart wallet is ready. Create a PIN to secure it - you'll enter it to approve payments."
        : `Choose a ${PIN_LENGTH}-${PIN_MAX_LENGTH} digit PIN.`
      : step === "confirm"
      ? "Re-enter your PIN to confirm."
      : "Used to reset your PIN if you ever forget it.";

  return (
    <ModalShell title={title} subtitle={subtitle} dismissible={false}>
      {step === "pin" && (
        <div className="flex flex-col gap-6">
          <PinPad value={pin} onChange={setPin} length={PIN_MAX_LENGTH} maxLength={PIN_MAX_LENGTH} error={!!error} />
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          <button
            onClick={goConfirm}
            disabled={!pinValid}
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
          <div className="flex gap-3">
            <button
              onClick={() => { setStep("pin"); setConfirmPin(""); setError(""); }}
              className="flex-1 rounded-xl border border-[#3A3C41] py-3 text-sm font-medium text-gray-300 hover:bg-[#292B30]"
            >
              Back
            </button>
            <button
              onClick={goSecurity}
              disabled={confirmPin.length < PIN_LENGTH}
              className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "security" && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Question</label>
            <select
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-xl bg-[#292B30] px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-600"
            >
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q} className="bg-[#292B30]">
                  {q}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Answer</label>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer"
              className="w-full rounded-xl bg-[#292B30] px-3 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={submit}
            disabled={isLoading}
            className="mt-2 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isLoading ? "Securing your wallet…" : "Finish setup"}
          </button>
          <button
            onClick={onClose}
            className="text-center text-xs text-gray-500 hover:text-gray-300"
          >
            I'll do this later
          </button>
        </div>
      )}
    </ModalShell>
  );
}
