import { useId } from "react";

export type PaymentType = "crypto" | "bank";

const OPTIONS: { value: PaymentType; label: string; hint: string }[] = [
  { value: "crypto", label: "Crypto", hint: "Buyers pay from a crypto wallet. You're paid to your wallet." },
  { value: "bank", label: "Bank transfer (₦)", hint: "Buyers pay in naira by bank transfer. You're paid to your bank account." },
];

interface Props {
  value: PaymentType;
  onChange: (value: PaymentType) => void;
}

/**
 * How buyers pay for a listing. A listing is one or the other for good: the
 * server won't switch a crypto listing to bank transfer or back.
 */
export default function PaymentTypeChoice({ value, onChange }: Props) {
  const name = useId();
  const hintId = `${name}-hint`;
  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <fieldset aria-describedby={hintId}>
      <legend className="sr-only">How buyers pay</legend>
      {/* Same look as the price field's currency toggle. */}
      <div className="flex gap-0.5 bg-[#212428] rounded-lg p-0.5">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex-1 text-center px-3 py-2 rounded-md text-xs font-semibold cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-red-400 ${
              value === option.value ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      <p id={hintId} className="text-xs text-gray-400 mt-2">
        {selected.hint} This can't be changed after listing.
      </p>
    </fieldset>
  );
}
