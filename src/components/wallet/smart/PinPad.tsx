import { memo } from "react";
import { FaBackspace } from "react-icons/fa";

interface Props {
  /** Current PIN value (controlled). */
  value: string;
  onChange: (next: string) => void;
  /** Max digits (defaults to 6). */
  maxLength?: number;
  /** Number of dots to render (the expected length). */
  length?: number;
  disabled?: boolean;
  error?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

/**
 * Numeric PIN keypad in the DezenMart dark theme. Controlled - the parent owns
 * the value. Used both to set a PIN and to authorise a transaction.
 */
const PinPad = memo(
  ({ value, onChange, maxLength = 6, length = 6, disabled = false, error = false }: Props) => {
    const press = (key: string) => {
      if (disabled) return;
      if (key === "back") {
        onChange(value.slice(0, -1));
        return;
      }
      if (!key) return;
      if (value.length >= maxLength) return;
      onChange((value + key).replace(/\D/g, ""));
    };

    return (
      <div className="flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex items-center gap-3" aria-hidden>
          {Array.from({ length }).map((_, i) => {
            const filled = i < value.length;
            return (
              <span
                key={i}
                className={`h-3.5 w-3.5 rounded-full border transition-colors ${
                  error
                    ? "border-red-500 bg-red-500"
                    : filled
                    ? "border-red-600 bg-red-600"
                    : "border-gray-600 bg-transparent"
                }`}
              />
            );
          })}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key, i) =>
            key === "" ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                disabled={disabled}
                aria-label={key === "back" ? "Delete" : key}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#292B30] text-lg font-semibold text-white transition-colors hover:bg-[#3A3C41] active:scale-95 disabled:opacity-50"
              >
                {key === "back" ? <FaBackspace className="h-5 w-5 text-gray-400" /> : key}
              </button>
            )
          )}
        </div>
      </div>
    );
  }
);

PinPad.displayName = "PinPad";

export default PinPad;
