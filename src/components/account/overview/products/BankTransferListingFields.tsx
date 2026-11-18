import type { Fulfilment } from "../../../../utils/validation/bankTransfer";
import { Field } from "../../../common/form/Field";
import { inputClass } from "../../../common/form/fieldStyles";

/** Price of a bank-transfer listing, typed in naira. Commas are fine ("50,000"). */
export function NairaPriceField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field
      label="Price (₦)"
      surface="card"
      error={error}
      hint="Buyers see this exact naira price. Delivery and a small service fee are added at checkout."
    >
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-300 pointer-events-none"
            aria-hidden
          >
            ₦
          </span>
          {/* Text, not number: a number input rejects "50,000" and shows the field as empty. */}
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="What one item costs"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={`${inputClass("card", invalid)} pl-7`}
          />
        </div>
      )}
    </Field>
  );
}

/** Delivery and/or pickup for a bank-transfer listing. Pickup needs a seller pickup address. */
export function FulfilmentOptions({
  value,
  canOfferPickup,
  error,
  onToggle,
}: {
  value: Fulfilment[];
  canOfferPickup: boolean;
  error?: string;
  onToggle: (option: Fulfilment) => void;
}) {
  const checkbox =
    "w-4 h-4 rounded border-[#767C87] text-red-600 bg-[#3A3C41] focus:ring-2 focus:ring-red-400 focus:ring-offset-0";
  return (
    // The divider sits on a wrapper: on a fieldset the browser draws the legend into the border.
    <div className="border-t border-[#3A3C41] pt-3">
      <fieldset aria-describedby={error ? "listing-fulfilment-error" : undefined}>
        <legend className="text-sm font-medium text-gray-300 mb-2">How buyers get it</legend>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes("delivery")}
              onChange={() => onToggle("delivery")}
              className={checkbox}
            />
            <span className="text-sm text-gray-300">Delivery to the buyer's address</span>
          </label>
          <label
            className={`flex items-center gap-3 ${canOfferPickup ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
          >
            <input
              type="checkbox"
              checked={value.includes("pickup")}
              onChange={() => onToggle("pickup")}
              disabled={!canOfferPickup}
              className={checkbox}
            />
            <span className="text-sm text-gray-300">Pickup from you</span>
          </label>
          {!canOfferPickup && (
            <p className="text-xs text-gray-400">
              To offer pickup, add a pickup address in Settings, under Bank Account for Payouts.
            </p>
          )}
        </div>
        {error && (
          <p id="listing-fulfilment-error" className="text-red-400 text-xs mt-1.5" role="alert">
            {error}
          </p>
        )}
      </fieldset>
    </div>
  );
}
