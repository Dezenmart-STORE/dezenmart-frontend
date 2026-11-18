import { useEffect, useRef, type ReactNode } from "react";

export type ConfirmTone = "green" | "red" | "amber";

/** The confirm boxes of the crypto order's TradeActions, one per tone. */
const TONES: Record<ConfirmTone, { box: string; title: string; text: string; yes: string; keep: string }> = {
  green: {
    box: "border-green-800/50 bg-green-900/20",
    title: "text-green-300",
    text: "text-green-200",
    yes: "bg-green-700 hover:bg-green-600",
    keep: "border-green-800/50 bg-green-900/20 text-green-300 hover:bg-green-900/40",
  },
  red: {
    box: "border-red-800/50 bg-red-900/20",
    title: "text-red-300",
    text: "text-red-200",
    yes: "bg-red-700 hover:bg-red-600",
    keep: "border-red-800/50 bg-red-900/20 text-red-300 hover:bg-red-900/40",
  },
  amber: {
    box: "border-amber-800/50 bg-amber-900/20",
    title: "text-amber-300",
    text: "text-amber-200",
    yes: "bg-amber-700 hover:bg-amber-600",
    keep: "border-amber-800/50 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40",
  },
};

interface Props {
  tone: ConfirmTone;
  question: string;
  detail: ReactNode;
  confirmLabel: string;
  keepLabel: string;
  busy: boolean;
  /** Extra fields, such as a reason, between the text and the buttons. */
  children?: ReactNode;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onKeep: () => void;
}

/**
 * Asks once more, in place, before something that can't be taken back.
 * Focus moves into the box so keyboard and screen-reader users land on the question.
 */
export default function InlineConfirm({
  tone,
  question,
  detail,
  confirmLabel,
  keepLabel,
  busy,
  children,
  confirmDisabled,
  onConfirm,
  onKeep,
}: Props) {
  const t = TONES[tone];
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => box.current?.focus(), []);

  return (
    <div
      ref={box}
      tabIndex={-1}
      role="group"
      aria-label={question}
      className={`rounded-xl border p-4 outline-none ${t.box}`}
    >
      <p className={`text-sm font-semibold ${t.title}`}>{question}</p>
      <div className={`mt-1 text-xs ${t.text}`}>{detail}</div>
      {children && <div className="mt-3">{children}</div>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || confirmDisabled}
          aria-busy={busy || undefined}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${t.yes}`}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
        <button
          type="button"
          onClick={onKeep}
          disabled={busy}
          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${t.keep}`}
        >
          {keepLabel}
        </button>
      </div>
    </div>
  );
}
