import { FC, useState, useEffect } from "react";
import {
  OrderDetails,
  TradeDetails,
  TradeTransactionInfo,
} from "../../../utils/types";
import BaseStatus from "./BaseStatus";
import StatusAlert from "./StatusAlert";
import Button from "../../common/Button";
import { BsShieldExclamation } from "react-icons/bs";

interface PendingPaymentStatusProps {
  tradeDetails: TradeDetails;
  orderDetails?: OrderDetails;
  transactionInfo: TradeTransactionInfo;
  onContactSeller?: () => void;
  onOrderDispute?: () => void;
  onReleaseNow?: () => void;
}

const PendingPaymentStatus: FC<PendingPaymentStatusProps> = ({
  tradeDetails,
  //   orderDetails,
  transactionInfo,
  onContactSeller,
  onOrderDispute,
  onReleaseNow,
}) => {
  const [timeRemaining, setTimeRemaining] = useState({
    minutes: 9,
    seconds: 59,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { minutes: prev.minutes - 1, seconds: 59 };
        clearInterval(timer);
        return { minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <BaseStatus
      statusTitle="Pending Payment"
      statusDescription="Please wait for the buyer to make payment. You'll be notified once payment is confirmed."
      statusAlert={
        <StatusAlert
          icon={<BsShieldExclamation size={20} className="text-yellow-600" />}
          message="To ensure the safety of your funds, please verify the real name of the payer: Femi Cole"
          type="warning"
        />
      }
      tradeDetails={tradeDetails}
      transactionInfo={transactionInfo}
      contactLabel="Contact Buyer"
      onContact={onContactSeller}
      showTimer={true}
      timeRemaining={timeRemaining}
      actionButtons={
        <div className="w-full flex justify-evenly flex-row flex-wrap gap-4">
          {onOrderDispute && (
            <Button
              title="Order Dispute?"
              className="bg-transparent hover:bg-gray-700 text-white text-sm px-6 py-3 border border-gray-600 rounded transition-colors "
              onClick={onOrderDispute}
            />
          )}
          <Button
            title="Release Now"
            className="bg-Red hover:bg-[#e02d37] text-white text-sm px-6 py-3 rounded transition-colors "
            onClick={onReleaseNow}
          />
        </div>
        // <div className="flex flex-col gap-4 mt-6">
        //   {onOrderDispute && (
        //     <Button
        //       text="Dispute Order"
        //       variant="outline"
        //       fullWidth
        //       onClick={() => onOrderDispute()}
        //     />
        //   )}
        // </div>
      }
    />
  );
};

export default PendingPaymentStatus;
