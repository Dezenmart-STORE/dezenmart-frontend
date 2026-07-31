import { useState } from "react";
import ModalShell from "./ModalShell";
import PinPad from "./PinPad";
import { parseWalletError } from "./walletError";
import { useVerifyWalletPinMutation } from "../../../store/api";
import { PIN_LENGTH, PIN_MAX_LENGTH } from "../../../config/smartWallet";

interface Props {
  onVerified: (txAuthToken: string) => void;
  onCancel: () => void;
  onForgot: () => void;
}

/** Asks for the wallet PIN to authorise a transaction. */
export default function PinPromptModal({ onVerified, onCancel, onForgot }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState<string | null>(null);
  const [verify, { isLoading }] = useVerifyWalletPinMutation();

  const submit = async () => {
    if (pin.length < PIN_LENGTH) return;
    setError("");
    try {
      const { txAuthToken } = await verify({ pin }).unwrap();
      onVerified(txAuthToken);
    } catch (e) {
      const parsed = parseWalletError(e, "Incorrect PIN.");
      setPin("");
      if (parsed.lockedUntil) setLocked(parsed.lockedUntil);
      setError(
        parsed.attemptsRemaining != null
          ? `${parsed.message} ${parsed.attemptsRemaining} attempt${parsed.attemptsRemaining === 1 ? "" : "s"} left.`
          : parsed.message
      );
    }
  };

  return (
    <ModalShell
      title="Enter your PIN"
      subtitle="Confirm this transaction with your wallet PIN."
      onClose={onCancel}
    >
      <div className="flex flex-col gap-6">
        <PinPad
          value={pin}
          onChange={setPin}
          length={PIN_MAX_LENGTH}
          maxLength={PIN_MAX_LENGTH}
          disabled={isLoading || !!locked}
          error={!!error}
        />
        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={pin.length < PIN_LENGTH || isLoading || !!locked}
          className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {isLoading ? "Verifying…" : "Authorize"}
        </button>

        <button onClick={onForgot} className="text-center text-xs text-gray-500 hover:text-gray-300">
          Forgot your PIN?
        </button>
      </div>
    </ModalShell>
  );
}
