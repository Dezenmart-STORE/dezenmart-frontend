import React, { useState } from "react";
import { motion } from "framer-motion";
import { LiaAngleLeftSolid } from "react-icons/lia";
import { RiBankLine } from "react-icons/ri";
import { HiCheckCircle } from "react-icons/hi2";
import { useGetMySellerProfileQuery, useUpdateMySellerProfileMutation } from "../../../store/api";
import { sellerProfileUpdateSchema } from "../../../utils/validation/bankTransfer";
import { maskAccountNumber } from "../../../utils/format";
import { useSnackbar } from "../../../context/SnackbarContext";
import LoadingSpinner from "../../common/LoadingSpinner";
import Button from "../../common/Button";
import { Field } from "../../common/form/Field";
import { inputClass } from "../../common/form/fieldStyles";
import PayoutAccountForm from "./PayoutAccountForm";

interface Props {
  onBack?: () => void;
}

/** Settings > Bank account for payouts. Where sellers get paid for bank-transfer sales. */
const PayoutAccount: React.FC<Props> = ({ onBack }) => {
  const { data: profile, isLoading, isError, refetch } = useGetMySellerProfileQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
          >
            <LiaAngleLeftSolid className="text-white text-xl" />
          </button>
        )}
        <h2 className="text-xl font-bold text-white">Bank Account for Payouts</h2>
      </div>

      {isError ? (
        <div className="text-center py-16 bg-[#292B30] rounded-2xl">
          <p className="text-gray-300 font-medium">Couldn't load your bank account</p>
          <button
            onClick={() => refetch()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : profile?.payoutAccount ? (
        <SavedAccount
          bankName={profile.payoutAccount.bankName}
          accountName={profile.payoutAccount.accountName}
          accountNumber={profile.payoutAccount.accountNumber}
          address={profile.address}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Add the account you want to be paid into when you sell by bank transfer. The buyer's
            money is held by our payment partner and sent here once they confirm delivery.
          </p>
          <PayoutAccountForm onCancel={onBack} />
        </div>
      )}
    </motion.div>
  );
};

function SavedAccount({
  bankName,
  accountName,
  accountNumber,
  address,
}: {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  address?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[#292B30] rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-[#3A3A3C] flex-shrink-0">
            <RiBankLine className="text-white text-base" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-medium text-sm">{accountName ?? "Your account"}</p>
            <p className="text-gray-300 text-sm mt-0.5">
              {[bankName, maskAccountNumber(accountNumber)].filter(Boolean).join(" · ")}
            </p>
            <p className="text-green-300 text-xs mt-2 flex items-center gap-1">
              <HiCheckCircle className="w-3 h-3" aria-hidden />
              Verified with your bank. You can sell by bank transfer.
            </p>
          </div>
        </div>
        <p className="text-gray-400 text-xs mt-3">
          To change this account, contact support. It can't be changed here, so payouts can't be
          redirected without a check.
        </p>
      </div>

      <PickupAddress current={address} />
    </div>
  );
}

function PickupAddress({ current }: { current?: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string>();
  const [updateProfile, { isLoading: saving }] = useUpdateMySellerProfileMutation();
  const { showSnackbar } = useSnackbar();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = sellerProfileUpdateSchema.safeParse({ address: value.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter the full pickup address");
      return;
    }
    try {
      await updateProfile(parsed.data).unwrap();
      showSnackbar("Pickup address saved", "success");
      setEditing(false);
    } catch {
      showSnackbar("Couldn't save the pickup address. Try again.", "error");
    }
  };

  return (
    <div className="bg-[#292B30] rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-white">Pickup address</h3>
      {!editing ? (
        <div className="flex items-start justify-between gap-3 mt-1">
          <p className="text-gray-300 text-sm">
            {current ?? "None yet. Without one, your listings offer delivery only."}
          </p>
          <button
            type="button"
            onClick={() => {
              setValue(current ?? "");
              setEditing(true);
            }}
            className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex-shrink-0"
          >
            {current ? "Edit" : "Add"}
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-3 mt-3" noValidate>
          <Field label="Where buyers can collect orders" surface="card" error={error}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="text"
                autoFocus
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(undefined);
                }}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                className={inputClass("card", invalid)}
                placeholder="14 Awolowo Road, Ikoyi, Lagos"
              />
            )}
          </Field>
          <div className="flex gap-3">
            <Button
              variant="primary"
              type="submit"
              loading={saving}
              loadingTitle="Saving…"
              title="Save Address"
              className="flex-1"
            />
            <Button
              variant="secondary"
              onClick={() => setEditing(false)}
              title="Cancel"
              className="bg-[#3A3A3C] hover:bg-[#484A4E]"
            />
          </div>
        </form>
      )}
    </div>
  );
}

export default PayoutAccount;
