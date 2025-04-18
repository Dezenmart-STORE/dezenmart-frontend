import { FC } from "react";
import { motion } from "framer-motion";
import { BiWallet } from "react-icons/bi";
import Button from "../common/Button";
interface ConnectWalletProps {
  onConnect: () => void;
  isConnecting: boolean;
}

const ConnectWallet: FC<ConnectWalletProps> = ({ onConnect, isConnecting }) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center p-10 bg-[#292B30] rounded-lg text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        whileHover={{ scale: 1.1, rotate: 15 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        className="text-Red text-5xl mb-6"
      >
        <BiWallet />
      </motion.div>
      <h2 className="text-2xl font-medium mb-4">Connect Your Wallet</h2>
      <p className="text-[#AEAEB2] mb-8">
        You need to connect your crypto wallet to access P2P trading features.
      </p>
      <Button
        title={isConnecting ? "Connecting..." : "Connect Wallet"}
        className={`bg-Red border-0 rounded-lg text-white px-8 py-3 transition-colors ${
          isConnecting ? "opacity-70" : "hover:bg-[#e02d37]"
        }`}
        path=""
        onClick={onConnect}
        disabled={isConnecting}
      />
    </motion.div>
  );
};

export default ConnectWallet;
