import React, { useCallback, useEffect, useRef, useState } from "react";
import { HiCheckCircle } from "react-icons/hi2";
import {
  useApplyAsSellerMutation,
  useGetBanksQuery,
  useResolveBankAccountMutation,
} from "../../../store/api";
import {
  accountNumberSchema,
  bankCodeSchema,
  sellerApplicationSchema,
  type SellerProfile,
} from "../../../utils/validation/bankTransfer";
import { apiErrorStatus } from "../../../utils/errors";
import { useSnackbar } from "../../../context/SnackbarContext";
import LoadingSpinner from "../../common/LoadingSpinner";
import Button from "../../common/Button";
import StatusBox from "../../common/StatusBox";
import { Field, SelectChevron } from "../../common/form/Field";
import { inputClass, optionClass, type FieldSurface } from "../../common/form/fieldStyles";

interface Props {
  /** "page" in Settings, "card" inside the listing form's sections. */
  surface?: FieldSurface;
  /** Ask for the pickup address too (optional; without it listings are delivery only). */
  askPickupAddress?: boolean;
  onSaved?: (profile: SellerProfile) => void;
  onCancel?: () => void;
}

/** Each lookup is tied to the bank and number it was asked for. */
type Lookup =
  | { state: "idle" }
  | { state: "checking"; key: string }
  | { state: "found"; key: string; accountName: string }
  | { state: "failed"; key: string; message: string };

type FieldErrors = Partial<Record<"bankCode" | "accountNumber" | "address", string>>;

const pairKey = (bankCode: string, accountNumber: string) => `${bankCode}:${accountNumber}`;

const lookupFailureMessage = (status: number | undefined) =>
  status === 429
    ? "Too many checks in a row. Wait a minute, then try again."
    : status === 422
      ? "Your bank couldn't find this account. Check the number and the bank."
      : "We couldn't check this account right now. Try again.";

const saveFailureMessage = (status: number | undefined) =>
  status === 403
    ? "Your seller account is suspended. Contact support to sort it out."
    : status === 400
      ? "Your bank couldn't verify this account. Check the details and try again."
      : "Couldn't save your bank account. Try again.";

const PayoutAccountForm: React.FC<Props> = ({
  surface = "page",
  askPickupAddress = true,
  onSaved,
  onCancel,
}) => {
  const { data: banks = [], isLoading: banksLoading, isError: banksFailed, refetch: refetchBanks } =
    useGetBanksQuery();
  const [resolveAccount] = useResolveBankAccountMutation();
  const [applyAsSeller, { isLoading: saving }] = useApplyAsSellerMutation();
  const { showSnackbar } = useSnackbar();

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [address, setAddress] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  // The key of the newest lookup; replies for any older pair are dropped.
  const latestLookup = useRef<string | undefined>(undefined);
  const savingRef = useRef(false);

  const currentKey = pairKey(bankCode, accountNumber);
  const pairIsValid =
    bankCodeSchema.safeParse(bankCode).success && accountNumberSchema.safeParse(accountNumber).success;
  const current = lookup.state !== "idle" && lookup.key === currentKey ? lookup : undefined;
  const confirmedName = current?.state === "found" ? current.accountName : undefined;

  const runLookup = useCallback(
    (code: string, number: string) => {
      const key = pairKey(code, number);
      latestLookup.current = key;
      setLookup({ state: "checking", key });
      resolveAccount({ bankCode: code, accountNumber: number })
        .unwrap()
        .then(({ accountName }) => {
          if (latestLookup.current === key) setLookup({ state: "found", key, accountName });
        })
        .catch((err: unknown) => {
          if (latestLookup.current === key)
            setLookup({ state: "failed", key, message: lookupFailureMessage(apiErrorStatus(err)) });
        });
    },
    [resolveAccount]
  );

  // Ask the bank for the holder's name once the pair is complete. The server
  // allows 10 lookups a minute, so each pair is asked once (retry is manual).
  useEffect(() => {
    if (pairIsValid && latestLookup.current !== currentKey) runLookup(bankCode, accountNumber);
  }, [pairIsValid, currentKey, bankCode, accountNumber, runLookup]);

  const clearFeedback = (field: keyof FieldErrors) => {
    setErrors((e) => ({ ...e, [field]: undefined }));
    setSubmitError(undefined);
  };

  const save = async () => {
    if (savingRef.current) return;
    setSubmitError(undefined);

    const parsed = sellerApplicationSchema.safeParse({
      payout: { bankCode, accountNumber },
      address: address.trim() || undefined,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[issue.path.length - 1];
        if (field === "bankCode" || field === "accountNumber" || field === "address") {
          next[field] ??= issue.message;
        }
      }
      setErrors(next);
      return;
    }
    if (!confirmedName) {
      setSubmitError("Wait for your bank to confirm the account name.");
      return;
    }

    savingRef.current = true;
    try {
      const profile = await applyAsSeller(parsed.data).unwrap();
      showSnackbar("Bank account saved", "success");
      onSaved?.(profile);
    } catch (err) {
      const message = saveFailureMessage(apiErrorStatus(err));
      setSubmitError(message);
      showSnackbar(message, "error");
    } finally {
      savingRef.current = false;
    }
  };

  // Inside another form (a card in the listing form) this can't be a <form>:
  // nested forms are invalid and would submit the listing. Enter saves this part instead.
  const embedded = surface === "card";
  const handleEmbeddedEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      void save();
    }
  };

  const numberStatus =
    current?.state === "checking" ? (
      <p className="text-gray-300 flex items-center gap-1.5">
        <LoadingSpinner size="sm" /> Checking with your bank…
      </p>
    ) : current?.state === "found" ? (
      <p className="text-green-300 flex items-center gap-1">
        <HiCheckCircle className="w-3 h-3" aria-hidden />
        Account name: <span className="font-semibold">{current.accountName}</span>
      </p>
    ) : current?.state === "failed" ? (
      <p className="text-red-300">
        {current.message}{" "}
        <button
          type="button"
          onClick={() => runLookup(bankCode, accountNumber)}
          className="underline hover:text-red-200"
        >
          Check again
        </button>
      </p>
    ) : undefined;

  const fields = (
    <>
      {banksFailed ? (
        <div>
          <p className={surface === "card" ? "text-sm font-medium text-gray-300 mb-1.5" : "text-xs font-medium text-gray-400 mb-1.5"}>
            Bank
          </p>
          <StatusBox
              tone="danger"
              action={
                <button
                  type="button"
                  onClick={() => refetchBanks()}
                  className="text-red-300 hover:text-red-200 text-sm font-medium underline"
                >
                  Retry
                </button>
              }
            >
            Couldn't load the list of banks.
          </StatusBox>
        </div>
      ) : (
      <Field label="Bank" required surface={surface} error={errors.bankCode}>
        {({ id, describedBy, invalid }) => (
            <div className="relative">
              <select
                id={id}
                value={bankCode}
                onChange={(e) => {
                  setBankCode(e.target.value);
                  clearFeedback("bankCode");
                }}
                disabled={banksLoading}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                className={`${inputClass(surface, invalid)} appearance-none cursor-pointer pr-8 ${
                  bankCode ? "text-white" : "text-gray-400"
                }`}
              >
                <option value="" disabled>
                  {banksLoading ? "Loading banks…" : "Select your bank"}
                </option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code} className={optionClass(surface)}>
                    {bank.name}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
        )}
      </Field>
      )}

      <Field
        label="Account number"
        required
        surface={surface}
        error={errors.accountNumber}
        status={numberStatus}
        hint="We'll check the name with your bank. Payouts go to this account."
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={accountNumber}
            onChange={(e) => {
              // Spaces and dashes are common when pasting; keep the digits only.
              setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
              clearFeedback("accountNumber");
            }}
            placeholder="10-digit account number"
            aria-invalid={invalid || current?.state === "failed"}
            aria-describedby={describedBy}
            className={`${inputClass(surface, invalid)} tracking-wider`}
          />
        )}
      </Field>

      {askPickupAddress && (
        <Field
          label={
            <>
              Pickup address <span className="text-gray-400 font-normal">(optional)</span>
            </>
          }
          surface={surface}
          error={errors.address}
          hint="Leave it empty to offer delivery only."
        >
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                clearFeedback("address");
              }}
              placeholder="Where buyers can collect orders"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={inputClass(surface, invalid)}
            />
          )}
        </Field>
      )}

      {submitError && <StatusBox tone="danger">{submitError}</StatusBox>}

      <div className="flex gap-3 pt-1">
        <Button
          variant="primary"
          type={embedded ? "button" : "submit"}
          onClick={embedded ? () => void save() : undefined}
          disabled={!confirmedName}
          loading={saving}
          loadingTitle="Saving…"
          icon={<HiCheckCircle className="w-4 h-4" aria-hidden />}
          iconPosition="start"
          title="Save bank account"
          className="flex-1"
        />
        {onCancel && (
          <Button
            variant="secondary"
            onClick={onCancel}
            title="Cancel"
            className={surface === "card" ? "bg-[#3A3C41] hover:bg-[#45474D]" : undefined}
          />
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div role="group" aria-label="Bank account for payouts" className="space-y-4" onKeyDown={handleEmbeddedEnter}>
        {fields}
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-4"
      noValidate
    >
      {fields}
    </form>
  );
};

export default PayoutAccountForm;
