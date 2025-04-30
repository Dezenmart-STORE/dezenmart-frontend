// import { FC } from "react";
// import CancelledStatus from "./CancelledStatus";
// import PendingPaymentStatus from "./PendingPaymentStatus";
// import FundsReleaseStatus from "./FundsReleaseStatus";
// import CompletedStatus from "./CompletedStatus";
// import {
//   Order,
//   OrderDetails,
//   StatusProps,
//   TradeDetails,
//   TradeTransactionInfo,
// } from "../../../utils/types";
// import { ErrorBoundary } from "react-error-boundary";

// interface TradeStatusProps extends StatusProps {
//   orderDetails?: OrderDetails;
// }

// const TradeStatus: FC<TradeStatusProps> = ({
//   status,
//   orderDetails,
//   tradeDetails,
//   transactionInfo,
//   onContactSeller,
//   onContactBuyer,
//   onOrderDispute,
//   onReleaseNow,
//   orderId,
// }) => {
//   // Ensure we have orderDetails and transactionInfo to prevent rendering errors
//   if (!tradeDetails || !transactionInfo) {
//     return (
//       <div className="text-center p-6 bg-[#292B30] rounded-lg">
//         <p className="text-gray-400">Order information is not available.</p>
//       </div>
//     );
//   }

//   // Use ErrorBoundary to catch any rendering errors
//   return (
//     <ErrorBoundary
//       fallback={
//         <div className="text-center p-6 bg-[#292B30] rounded-lg">
//           <p className="text-Red">
//             Something went wrong displaying the order status.
//           </p>
//         </div>
//       }
//     >
//       {renderStatusComponent(
//         status,
//         orderDetails,
//         tradeDetails,
//         transactionInfo,
//         onContactSeller,
//         onContactBuyer,
//         onOrderDispute,
//         onReleaseNow,
//         orderId
//       )}
//     </ErrorBoundary>
//   );
// };

// const renderStatusComponent = (
//   status: string,
//   orderDetails?: OrderDetails,
//   tradeDetails?: TradeDetails,
//   transactionInfo?: TradeTransactionInfo,
//   onContactSeller?: () => void,
//   onContactBuyer?: () => void,
//   onOrderDispute?: (reason?: string) => void,
//   onReleaseNow?: () => void,
//   orderId?: string
// ) => {
//   switch (status) {
//     case "cancelled":
//       return (
//         <CancelledStatus
//           orderDetails={orderDetails}
//           tradeDetails={tradeDetails}
//           transactionInfo={transactionInfo}
//           onContactSeller={onContactSeller}
//           onOrderDispute={onOrderDispute}
//         />
//       );
//     case "pending":
//       return (
//         <PendingPaymentStatus
//           orderDetails={orderDetails}
//           tradeDetails={tradeDetails}
//           transactionInfo={transactionInfo}
//           onContactSeller={onContactSeller}
//           onOrderDispute={onOrderDispute}
//           onReleaseNow={onReleaseNow}
//         />
//       );
//     case "release":
//       return (
//         <FundsReleaseStatus
//           orderDetails={orderDetails}
//           tradeDetails={tradeDetails}
//           transactionInfo={transactionInfo}
//           onContactSeller={onContactSeller}
//           onOrderDispute={onOrderDispute}
//           onReleaseNow={onReleaseNow}
//           orderId={orderId}
//         />
//       );
//     case "completed":
//       return (
//         <CompletedStatus
//           orderDetails={orderDetails}
//           tradeDetails={tradeDetails}
//           transactionInfo={transactionInfo}
//           onContactBuyer={onContactBuyer}
//           onLeaveReview={() =>
//             (window.location.href = `/review/create/${orderId}`)
//           }
//           onViewFAQ={() => (window.location.href = "/faq")}
//         />
//       );
//     default:
//       return (
//         <PendingPaymentStatus
//           orderDetails={orderDetails}
//           tradeDetails={tradeDetails}
//           transactionInfo={transactionInfo}
//           onContactSeller={onContactSeller}
//           onOrderDispute={onOrderDispute}
//           onReleaseNow={onReleaseNow}
//         />
//       );
//   }
// };

// export default TradeStatus;

import { FC } from "react";
import CancelledStatus from "./CancelledStatus";
import PendingPaymentStatus from "./PendingPaymentStatus";
import FundsReleaseStatus from "./FundsReleaseStatus";
import CompletedStatus from "./CompletedStatus";
import {
  OrderDetails,
  StatusProps,
  TradeDetails,
  TradeTransactionInfo,
} from "../../../utils/types";
import { ErrorBoundary } from "react-error-boundary";

interface TradeStatusProps extends StatusProps {
  orderDetails?: OrderDetails;
}

const TradeStatus: FC<TradeStatusProps> = ({
  status,
  orderDetails,
  tradeDetails,
  transactionInfo,
  onContactSeller,
  onContactBuyer,
  onOrderDispute,
  onReleaseNow,
  orderId,
}) => {
  const details = tradeDetails || (orderDetails as unknown as TradeDetails);
  const transactionData = transactionInfo || {
    buyerName: "Unknown",
    goodRating: 0,
    completedOrders: 0,
    completionRate: 0,
    avgPaymentTime: 0,
  };

  if (!details) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        Order information is not available.
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-100 text-red-800 rounded-lg">
          Something went wrong displaying the order status.
        </div>
      }
    >
      {renderStatusComponent(
        status,
        orderDetails,
        details,
        transactionData,
        onContactSeller,
        onContactBuyer,
        onOrderDispute,
        onReleaseNow,
        orderId
      )}
    </ErrorBoundary>
  );
};

const renderStatusComponent = (
  status: string,
  orderDetails?: OrderDetails,
  tradeDetails?: TradeDetails,
  transactionInfo?: TradeTransactionInfo,
  onContactSeller?: () => void,
  onContactBuyer?: () => void,
  onOrderDispute?: (reason?: string) => void,
  onReleaseNow?: () => void,
  orderId?: string
) => {
  switch (status) {
    case "cancelled":
      return (
        <CancelledStatus
          tradeDetails={tradeDetails!}
          orderDetails={orderDetails!}
          transactionInfo={transactionInfo!}
          onContactSeller={onContactSeller}
          onOrderDispute={onOrderDispute}
        />
      );
    case "pending":
      return (
        <PendingPaymentStatus
          tradeDetails={tradeDetails!}
          orderDetails={orderDetails!}
          transactionInfo={transactionInfo!}
          onContactSeller={onContactSeller}
          onOrderDispute={onOrderDispute}
          onReleaseNow={onReleaseNow}
        />
      );
    case "release":
      return (
        <FundsReleaseStatus
          tradeDetails={tradeDetails!}
          orderDetails={orderDetails!}
          transactionInfo={transactionInfo!}
          onContactSeller={onContactSeller}
          onOrderDispute={onOrderDispute}
          onReleaseNow={onReleaseNow}
          orderId={orderId}
        />
      );
    case "completed":
      return (
        <CompletedStatus
          orderDetails={orderDetails}
          tradeDetails={tradeDetails}
          onContactBuyer={onContactBuyer}
        />
      );
    default:
      return (
        <PendingPaymentStatus
          tradeDetails={tradeDetails!}
          orderDetails={orderDetails!}
          transactionInfo={transactionInfo!}
          onContactSeller={onContactSeller}
          onOrderDispute={onOrderDispute}
          onReleaseNow={onReleaseNow}
        />
      );
  }
};

export default TradeStatus;
