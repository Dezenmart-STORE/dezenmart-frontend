'use client'
import { motion } from "framer-motion";
import { FC, useState, useCallback } from "react";
import {
  FaWallet,
  FaSpinner,
  FaGoogle,
  FaEnvelope,
  FaPhone,
  FaFingerprint,
  FaUserSecret,
  FaSignOutAlt,
} from "react-icons/fa";
import TransactionConfirmation from "./TransactionConfirmation";
import ConfirmDelivery from "./ConfirmDelivery";
import { useWallet } from "../../utils/hooks/useWallet";

interface ConnectWalletProps {
  showAlternatives?: boolean;
  pendingTransaction?: {
    type: "escrow" | "delivery";
    contractAddress?: string;
    amount?: string;
    tradeId?: string;
  } | null;
  onTransactionComplete?: (success: boolean) => void;
}

const ConnectWallet: FC<ConnectWalletProps> = ({
  showAlternatives = true,
  pendingTransaction = null,
  onTransactionComplete = () => {},
}) => {
  const {
    isConnecting,
    isConnected,
    account,
    balance,
    chainId,
    connectMetaMask,
    connectGoogle,
    connectEmail: walletConnectEmail,
    connectPhone: walletConnectPhone,
    connectPasskey,
    connectGuest,
    disconnect,
  } = useWallet();

  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"main" | "email" | "phone">(
    "main"
  );
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [authMethod, setAuthMethod] = useState<"email" | "phone" | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleConnect = useCallback(async () => {
    setError(null);
    try {
      await connectMetaMask();
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    }
  }, [connectMetaMask]);

  const handleEmailConnect = useCallback(async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setError(null);
    setIsVerifying(true);
    try {
      const result = await walletConnectEmail(email);
      if (result?.preAuth) {
        setAuthMethod("email");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setIsVerifying(false);
    }
  }, [email, walletConnectEmail]);

  const handlePhoneConnect = useCallback(async () => {
    if (!phone) {
      setError("Please enter your phone number");
      return;
    }
    setError(null);
    setIsVerifying(true);
    try {
      const result = await walletConnectPhone(phone);
      if (result?.preAuth) {
        setAuthMethod("phone");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setIsVerifying(false);
    }
  }, [phone, walletConnectPhone]);

  const verifyCode = useCallback(async () => {
    if (!verificationCode) {
      setError("Please enter the verification code");
      return;
    }
    setError(null);
    setIsVerifying(true);
    try {
      if (authMethod === "email") {
        await walletConnectEmail(email, verificationCode);
      } else if (authMethod === "phone") {
        await walletConnectPhone(phone, verificationCode);
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify code");
    } finally {
      setIsVerifying(false);
    }
  }, [
    authMethod,
    email,
    phone,
    verificationCode,
    walletConnectEmail,
    walletConnectPhone,
  ]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    setError(null);
    setActiveTab("main");
    setEmail("");
    setPhone("");
    setVerificationCode("");
    setAuthMethod(null);
    setShowDetails(false);
    setIsVerifying(false);
  }, [disconnect]);

  const shortenedAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : "";

  if (isConnected && account) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto bg-[#212428] p-6 md:p-8 rounded-lg shadow-lg"
      >
        <div className="text-center mb-6">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-Red/10 text-Red mb-4"
          >
            <FaWallet className="text-3xl" />
          </motion.div>
          <p className="text-gray-400 text-sm mb-2">
            Connected as <span className="font-semibold text-white">{shortenedAddress}</span>
          </p>
          <h2 className="text-xl font-semibold">Wallet Connected</h2>
        </div>
        {showDetails ? (
          <div className="space-y-4">
            <div className="bg-[#2A2D35] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Address</p>
              <p className="text-white font-mono text-sm break-all">
                {account}
              </p>
            </div>
            <div className="bg-[#2A2D35] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Balance</p>
              <p className="text-white">{balance || "Loading..."}</p>
            </div>
            <div className="bg-[#2A2D35] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Chain ID</p>
              <p className="text-white">{chainId}</p>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="w-full py-3 bg-[#2A2D35] hover:bg-[#35383F] text-white rounded transition-colors"
            >
              Hide Details
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full py-3 bg-Red hover:bg-[#e02d37] text-white rounded transition-colors flex items-center justify-center"
            >
              <FaSignOutAlt className="mr-2" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => setShowDetails(true)}
              className="w-full py-3 bg-[#2A2D35] hover:bg-[#35383F] text-white rounded transition-colors"
            >
              View Details
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full py-3 bg-Red hover:bg-[#e02d37] text-white rounded transition-colors flex items-center justify-center"
            >
              <FaSignOutAlt className="mr-2" />
              Sign Out
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  if (authMethod) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-md mx-auto bg-[#212428] p-6 md:p-8 rounded-lg shadow-lg"
      >
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Verify Your {authMethod === "email" ? "Email" : "Phone"}
          </h2>
          <p className="text-gray-400 text-sm">
            Enter the verification code sent to your{" "}
            {authMethod === "email" ? "email" : "phone"}
          </p>
        </div>
        <div className="mb-6">
          <input
            type="text"
            placeholder="Verification Code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="w-full bg-[#2A2D35] border border-[#3A3D45] rounded p-3 text-white focus:outline-none focus:border-Red focus:ring-1 focus:ring-Red"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setAuthMethod(null);
              setActiveTab("main");
            }}
            className="w-1/2 py-3 rounded bg-[#2A2D35] text-gray-300 hover:bg-[#35383F] transition-colors"
          >
            Back
          </button>
          <button
            onClick={verifyCode}
            disabled={isVerifying}
            className="w-1/2 py-3 bg-Red hover:bg-[#e02d37] text-white rounded transition-colors flex items-center justify-center"
          >
            {isVerifying ? <FaSpinner className="animate-spin mr-2" /> : null}
            Verify
          </button>
        </div>
      </motion.div>
    );
  }

  if (activeTab === "email") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-md mx-auto bg-[#212428] p-6 md:p-8 rounded-lg shadow-lg"
      >
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Connect with Email</h2>
          <p className="text-gray-400 text-sm">
            We'll send you a verification code
          </p>
        </div>
        <div className="mb-6">
          <input
            type="email"
            placeholder="Your Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#2A2D35] border border-[#3A3D45] rounded p-3 text-white focus:outline-none focus:border-Red focus:ring-1 focus:ring-Red"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab("main")}
            className="w-1/2 py-3 rounded bg-[#2A2D35] text-gray-300 hover:bg-[#35383F] transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleEmailConnect}
            disabled={isVerifying}
            className="w-1/2 py-3 bg-Red hover:bg-[#e02d37] text-white rounded transition-colors flex items-center justify-center"
          >
            {isVerifying ? <FaSpinner className="animate-spin mr-2" /> : null}
            Continue
          </button>
        </div>
      </motion.div>
    );
  }

  if (activeTab === "phone") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-md mx-auto bg-[#212428] p-6 md:p-8 rounded-lg shadow-lg"
      >
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        <div className="text-center mb-6">
          <h2 className="account text-xl font-semibold mb-2">Connect with Phone</h2>
          <p className="text-gray-400 text-sm">
            We'll send you a verification code via SMS
          </p>
        </div>
        <div className="mb-6">
          <input
            type="tel"
            placeholder="Your Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[#2A2D35] border border-[#3A3D45] rounded p-3 text-white focus:outline-none focus:border-Red focus:ring-1 focus:ring-Red"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab("main")}
            className="w-1/2 py-3 rounded bg-[#2A2D35] text-gray-300 hover:bg-[#35383F] transition-colors"
          >
            Back
          </button>
          <button
            onClick={handlePhoneConnect}
            disabled={isVerifying}
            className="w-1/2 py-3 bg-Red hover:bg-[#e02d37] text-white rounded transition-colors flex items-center justify-center"
          >
            {isVerifying ? <FaSpinner className="animate-spin mr-2" /> : null}
            Continue
          </button>
        </div>
      </motion.div>
    );
  }

  if (pendingTransaction) {
    if (
      pendingTransaction.type === "escrow" &&
      pendingTransaction.contractAddress &&
      pendingTransaction.amount
    ) {
      return (
        <TransactionConfirmation
          contractAddress={pendingTransaction.contractAddress}
          amount={pendingTransaction.amount}
          onComplete={onTransactionComplete}
        />
      );
    }

    if (pendingTransaction.type === "delivery" && pendingTransaction.tradeId) {
      return (
        <ConfirmDelivery
          tradeId={pendingTransaction.tradeId}
          onComplete={() => onTransactionComplete(true)}
        />
      );
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto bg-[#212428] p-6 md:p-8 rounded-lg shadow-lg"
    >
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}
      <div className="text-center mb-6">
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-Red/10 text-Red mb-4"
        >
          <FaWallet className="text-3xl" />
        </motion.div>
        <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400 text-sm">
          Connect your wallet to start trading digital assets securely.
        </p>
      </div>
      <div className="space-y-3">
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full py-3 bg-Red hover:bg-[#e02d37] text-white rounded transition-colors flex items-center justify-center"
        >
          {isConnecting ? (
            <FaSpinner className="animate-spin mr-2" />
          ) : (
            <FaWallet className="mr-2" />
          )}
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
        {showAlternatives && (
          <>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-[#3A3D45]"></div>
              <span className="flex-shrink px-3 text-xs text-gray-400">
                or continue with
              </span>
              <div className="flex-grow border-t border-[#3A3D45]"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={connectGoogle}
                className="py-3 bg-[#2A2D35] hover:bg-[#35383F] text-white rounded transition-colors flex items-center justify-center"
              >
                <FaGoogle className="mr-2" />
                Google
              </button>
              <button
                onClick={() => setActiveTab("email")}
                className="py-3 bg-[#2A2D35] hover:bg-[#35383F] text-white rounded transition-colors flex items-center justify-center"
              >
                <FaEnvelope className="mr-2" />
                Email
              </button>
              <button
                onClick={() => setActiveTab("phone")}
                className="py-3 bg-[#2A2D35] hover:bg-[#35383F] text-white rounded transition-colors flex items-center justify-center"
              >
                <FaPhone className="mr-2" />
                Phone
              </button>
              <button
                onClick={connectPasskey}
                className="py-3 bg-[#2A2D35] hover:bg-[#35383F] text-white rounded transition-colors flex items-center justify-center"
              >
                <FaFingerprint className="mr-2" />
                Passkey
              </button>
              <button
                onClick={connectGuest}
                className="col-span-2 py-3 bg-[#2A2D35] hover:bg-[#35383F] text-white rounded transition-colors flex items-center justify-center"
              >
                <FaUserSecret className="mr-2" />
                Continue as Guest
              </button>
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-6 text-center">
        By connecting, you agree to our Terms of Service and Privacy Policy
      </p>
    </motion.div>
  );
};

export default ConnectWallet;
