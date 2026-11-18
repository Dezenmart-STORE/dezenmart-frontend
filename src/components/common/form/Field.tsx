import { useId, type ReactNode } from "react";
import type { FieldSurface } from "./fieldStyles";

/**
 * Form field primitives: a labelled control with its hint or error.
 *
 * Hint text is gray-400 (5.6:1 on the card surface #292B30); input styles
 * and their contrast live in fieldStyles.ts.
 */
interface FieldProps {
  label: ReactNode;
  required?: boolean;
  /** Shown under the control while there is no error. */
  hint?: ReactNode;
  error?: string;
  /** Live status line (lookups, checks) announced politely; replaces the hint. */
  status?: ReactNode;
  surface?: FieldSurface;
  /** Receives the ids to wire onto the control so label and messages are announced. */
  children: (control: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

export function Field({ label, required, hint, error, status, surface = "page", children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || status || hint);
  const labelClass =
    surface === "card"
      ? "block text-sm font-medium text-gray-300 mb-1.5"
      : "block text-xs font-medium text-gray-400 mb-1.5";

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && (
          <span className="text-red-400 ml-0.5" aria-hidden>
            *
          </span>
        )}
      </label>
      {children({ id, describedBy: hasMessage ? messageId : undefined, invalid: Boolean(error) })}
      <div id={messageId} aria-live="polite" className={hasMessage ? "mt-1" : undefined}>
        {error ? (
          <p className="text-red-400 text-xs">{error}</p>
        ) : status ? (
          <div className="text-xs">{status}</div>
        ) : hint ? (
          <p className="text-gray-400 text-xs">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/** The dropdown cue native selects lose with appearance-none. */
export function SelectChevron() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" aria-hidden>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
        />
      </svg>
    </div>
  );
}
