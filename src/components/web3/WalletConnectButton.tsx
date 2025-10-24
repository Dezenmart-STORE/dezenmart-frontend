import React, { useState } from "react";
import { HiWallet } from "react-icons/hi2";
import Button from "../common/Button";
import WalletConnectionModal from "./WalletConnectionModal";
import WalletDetailsModal from "./WalletDetailsModal";
import { useWeb3 } from "../../context/Web3Context";
import { truncateAddress } from "../../utils/web3.utils";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useGeneralStore } from "../../context/GeneralContext";
import { CHAINENUMS } from "../account/overview/products/CreateProduct";

const WalletConnectButton: React.FC = () => {
    const store =useGeneralStore()
  const { wallet } = useWeb3();
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  if (wallet.isConnected && wallet.address) {
    return (
      <>
        <Button
          title={
            <span className="max-md:hidden">
              {truncateAddress(wallet.address)}
            </span>
          }
          icon={<HiWallet className="w-4 h-4" />}
          iconPosition="start"
          onClick={() => setShowDetailsModal(true)}
          className="flex items-center justify-center bg-[#292B30] hover:bg-[#33363b] text-white"
          aria-label="Wallet connected"
        />

        <WalletDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
        />
      </>
    );
  }


  switch(store.selectedChain){
    case CHAINENUMS.solana:{
      return   ( 
        <Button
        title={
       <WalletMultiButton  className="bg-[blue]"style={{color:"white",padding:0,background:"transparent",margin:0 ,fontSize:15 ,height:0}}  />
        }
        icon={<HiWallet className="w-4 h-4" />}
        iconPosition="start"
        onClick={() => setShowConnectionModal(true)}
        disabled={wallet.isConnecting}
        className="flex items-center  justify-center bg-[#292B30] text-white"
        aria-label="Connect wallet"
      /> 
    )

    }

    default:{

      return (
        <>
          <Button
            title={
              <span className="max-md:hidden">
                {wallet.isConnecting ? "Connecting..." : "Connect Wallet"}
              </span>
            }
            icon={<HiWallet className="w-4 h-4" />}
            iconPosition="start"
            onClick={() => setShowConnectionModal(true)}
            disabled={wallet.isConnecting}
            className="flex items-center justify-center bg-[#292B30] text-white"
            aria-label="Connect wallet"
          />
       
    
          <WalletConnectionModal
            isOpen={showConnectionModal}
            onClose={() => setShowConnectionModal(false)}
          />
        </>
      );
    }
  }
};

export default WalletConnectButton;
