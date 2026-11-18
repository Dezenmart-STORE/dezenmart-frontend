import { useEffect, useState, type ReactNode } from "react";
import { HiCheck, HiOutlineClipboardDocument } from "react-icons/hi2";
import { copyToClipboard } from "../../../utils/format";

interface Props {
  label: string;
  /** What the buyer reads. */
  display: ReactNode;
  /** What lands on the clipboard: digits only, so a banking app accepts it as pasted. */
  copyValue?: string;
  hint?: ReactNode;
  emphasis?: boolean;
}

/** One line of payment details, with a copy button where typing it would be error-prone. */
export default function CopyRow({ label, display, copyValue, hint, emphasis }: Props) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`mt-0.5 break-words font-semibold text-white ${emphasis ? "text-lg" : "text-sm"}`}>{display}</p>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        {failed && (
          <p role="alert" className="mt-1 text-xs text-red-300">
            Couldn't copy. Select the {label.toLowerCase()} and copy it by hand.
          </p>
        )}
      </div>
      {copyValue && (
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            copyToClipboard(copyValue)
              .then(() => setCopied(true))
              .catch(() => setFailed(true));
          }}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-[#3A3C41] px-3 py-2 text-xs font-medium text-gray-200 transition-colors hover:bg-[#45474D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          {copied ? <HiCheck className="h-4 w-4 text-green-400" aria-hidden /> : <HiOutlineClipboardDocument className="h-4 w-4" aria-hidden />}
          <span aria-hidden>{copied ? "Copied" : "Copy"}</span>
        </button>
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copied` : ""}
      </span>
    </div>
  );
}
