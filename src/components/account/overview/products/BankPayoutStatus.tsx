import type { SellerProfile } from "../../../../utils/validation/bankTransfer";
import { maskAccountNumber } from "../../../../utils/format";
import LoadingSpinner from "../../../common/LoadingSpinner";
import StatusBox from "../../../common/StatusBox";
import PayoutAccountForm from "../../payout/PayoutAccountForm";

interface Props {
  profile: SellerProfile | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * "Receive Payment" for a bank-transfer listing: the verified account payouts
 * go to, or the setup form when there isn't one yet (the server requires it).
 */
export default function BankPayoutStatus({ profile, isLoading, isError, onRetry }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-300 text-sm py-2">
        <LoadingSpinner size="sm" /> Checking your bank account…
      </div>
    );
  }

  if (isError) {
    return (
      <StatusBox
        tone="danger"
        action={
          <button
            type="button"
            onClick={onRetry}
            className="text-red-300 hover:text-red-200 text-sm font-medium underline"
          >
            Retry
          </button>
        }
      >
        Couldn't check your bank account.
      </StatusBox>
    );
  }

  const account = profile?.payoutAccount;
  if (account) {
    return (
      <StatusBox tone="success" title={account.accountName ?? "Your bank account"}>
        <p>{[account.bankName, maskAccountNumber(account.accountNumber)].filter(Boolean).join(" · ")}</p>
        <p className="text-gray-300 text-xs mt-1">Paid here once the buyer confirms delivery.</p>
      </StatusBox>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-300 text-sm">
        Add the bank account you want to be paid into. You only do this once.
      </p>
      {/* No cancel here: the rest of the form stays on screen. */}
      <PayoutAccountForm surface="card" />
    </div>
  );
}
