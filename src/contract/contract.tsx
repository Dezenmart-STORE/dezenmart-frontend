import { PublicKey } from "@solana/web3.js"
import { CHAINENUMS } from "../components/account/overview/products/CreateProduct"
import { useGeneralStore } from "../context/GeneralContext"
import { TESTACCOUNT, TESTTOKENACCOUNT, TESTTOKENMINT, useSolanaContract } from "./solanaContract"
import { useWeb3 } from "../context/Web3Context"
import { useEffect, useMemo, useState } from "react"
import { useCurrencyConverter } from "../utils/hooks/useCurrencyConverter"
import { setBalance } from "viem/actions"
import SolanaPaymentModal from "../components/web3/p/solana"
import PaymentModal from "../components/web3/p/PaymentModal"
import { hash } from "@coral-xyz/anchor/dist/cjs/utils/sha256"
import { useContract } from "../utils/hooks/useSmartContract"

interface IBuyTrade{
    chain?:CHAINENUMS
    tradeId:number|string
    purchaseId:number|string
    quantity:number
    logisticsProvider:string
    tokenMint:string|PublicKey
    buyerTokenAccount?:string|PublicKey
    sellerTokenAccount?:string|PublicKey
    sellerAccount?:string|PublicKey
    paymentToken?:string
    requiredAmount?:string|number
    onTxSent?:any

}
export const useGeneralContract = ()=>{
    const { confirmDeliveryAndPurchase } = useContract();
  const { convertPrice } = useCurrencyConverter();
    let store = useGeneralStore()
    let selectedChain =    store.selectedChain
    let solanaContract = useSolanaContract()
  let  ethereumContractManager= useWeb3()
let wallet:any =  useMemo(()=>{
    switch(store.selectedChain){
        case CHAINENUMS.solana:{
            return solanaContract.wallet
        }
        case CHAINENUMS.ethereum:{
            return ethereumContractManager.wallet
        }

        default:{
            return null
        }

}
},[solanaContract.wallet,ethereumContractManager.wallet,store.selectedChain])
const walletFactory = useMemo(()=>{
    let publicKey = null
    let isConnected = false
    let address = null
  
    switch(store.selectedChain){
        case CHAINENUMS.solana:{
            publicKey = solanaContract.wallet?.publicKey
            address = solanaContract.wallet?.publicKey.toBase58()
            isConnected = !!solanaContract.wallet?.publicKey
            break;
        }
        case CHAINENUMS.ethereum:{
            isConnected = ethereumContractManager.wallet.isConnected
           address =  ethereumContractManager.wallet.address
        //    balance = ethereumContractManager.wallet.balance
        //    tokenBalance = ethereumContractManager.wallet.tokenBalances
          publicKey = new  PublicKey(ethereumContractManager?.wallet?.address ||TESTACCOUNT) 
          break;
        }

        default:{
            // return null
        }

}
return {publicKey,isConnected,address}
},[wallet])

let getTokenBalance = async ({symbol,address,chain,requiredAmount,tokenMint,orderAmount}:{symbol?:string,address?:string|PublicKey,chain?:CHAINENUMS,requiredAmount?:number,tokenMint?:string|PublicKey,orderAmount?:number})=>{
   let balance = 0
   let hasSufficientBalance = false
  
    switch(chain||store.selectedChain){
        case CHAINENUMS.solana:{
            if(address||tokenMint){

                 let v  = await solanaContract.getTokenBalance({ata: address?new PublicKey(address as any):TESTTOKENACCOUNT,tokenMint:new PublicKey(tokenMint||TESTTOKENMINT),owner:solanaContract.wallet.publicKey}as any)
                 balance = Number(v.uiAmount.toString())
              
                   if(requiredAmount ){

  hasSufficientBalance= Number(balance) >= requiredAmount;

                   }
            }
            break

        };
        case CHAINENUMS.ethereum:{

if(symbol){

    balance = wallet.tokenBalances[symbol].raw
    if(orderAmount){

        hasSufficientBalance= Number(balance) >= orderAmount;
        return
    }
    if(requiredAmount ){
    
            const totalInPayment = convertPrice(
          requiredAmount,
          "USDT",
          symbol
        );
    
              hasSufficientBalance= Number(balance) >= totalInPayment;
    
    
    
        
    
    
        
    }
}
break
        }
    
    }

    return {balance,hasSufficientBalance}
}

let [walletBalance,setWalletBalance] = useState(0);
  useEffect( ()=>{

      let f =async ()=>{
      //  const gasBalance = useMemo(
      //     () => parseFloat(wallet.balance || "0"),
      //     [wallet.balance]
      //   );

      let balance = 0
    
       switch(store.selectedChain){
             case CHAINENUMS.solana:{
             
    
           balance = 1234567890
    
                 break
    
             }
             
             
             default:{
               
    
     balance = parseFloat(wallet?.balance || "0")
     
    // await ethereumContractManager.connectWallet()
             }
    
         }

         setWalletBalance(balance)
    }

    f()
  }
    
,[wallet])

    // const tokenBalance = useMemo(() => {
    //   if (!walletFactory.isConnected ) return false;

    //   const requiredAmount =
    //     wallet.selectedToken.symbol === product?.paymentToken
    //       ? computedTotals.totalInPayment
    //       : computedTotals.totalInSelected;

    //   const currentBalance = wallet.tokenBalances[wallet.selectedToken.symbol];
    //   if (!currentBalance) return false;

    //   // console.log("parseFloat(currentBalance.raw)", parseFloat(currentBalance.raw));
    //   // console.log("requiredAmount", requiredAmount);
    //   return parseFloat(currentBalance.raw) >= requiredAmount;
    // }, [wallet]);

// let walletisConnected:any = ()()
    let buyTrade=async ({onTxSent ,requiredAmount,paymentToken,chain=store.selectedChain as CHAINENUMS,tradeId,purchaseId,quantity,logisticsProvider,tokenMint=TESTTOKENMINT,buyerTokenAccount}:IBuyTrade)=>{
buyerTokenAccount = buyerTokenAccount || await solanaContract.getatatadress({tokenMint})
solanaContract.getTokenBalance
let buyer = (solanaContract?.wallet?.publicKey) as PublicKey
        switch(chain){
            case CHAINENUMS.solana:{
                let tx = await solanaContract.buyTrade({
                    tradeId:Number(tradeId),
                    buyer,
                    purchaseId:Number(purchaseId),
                    quantity,
                    logisticsProvider:new PublicKey(logisticsProvider),
                    tokenMint:new PublicKey(tokenMint),
                    buyerTokenAccount:new PublicKey(buyerTokenAccount)

                    


                })

                if(onTxSent){
                    onTxSent({hash:tx})
                }


return {hash:tx}
          

                break

            }
            
            
            default:{
//                 if(paymentToken && requiredAmount){

//                     await ethereumContractManager.approveToken(paymentToken, requiredAmount);
//                     //  await ethereumContractManager.refreshTokenBalance();
//                 }else{
//    throw new Error("Please enter Payment token and required amount");
//                 }





  try {
          const approvalTx = await ethereumContractManager.approveToken(
            // selectedToken.symbol,
            paymentToken||"",
            (requiredAmount||"")?.toString()
          );
          if (approvalTx !== "0x0") {
            if(onTxSent){
                onTxSent(approvalTx)
            }
            // setApprovalHash(approvalTx);
            // showSnackbar(
            //   `${selectedToken.symbol} approval submitted. Waiting for confirmation...`,
            //   "info"
            // );
            let confirmed = false;
            let attempts = 0;
            const maxAttempts = 20; // 40 seconds total
            while (!confirmed && attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              try {
                const newAllowance = await ethereumContractManager.getTokenAllowance(
                //   selectedToken.symbol
                  paymentToken||""
                );
                if (newAllowance >= Number(requiredAmount)) {
                  confirmed = true;
                  break;
                }
              } catch (checkError) {
                console.warn("Allowance check failed:", checkError);
              }
              attempts++;
            }
            if (!confirmed) {
              throw new Error(
                "Approval confirmation timeout. Please try again."
              );
            }
          }
          
       
        } catch (approvalError) {
          console.error("Approval failed:", approvalError);
        //   throw new Error(`Approval failed: ${ethparseWeb3Error(approvalError)}`);
          throw new Error(`Approval failed: }`);
        }



            }

        }



        
    }

    
    let confirmDelivery=async ({onTxSent,sellerAccount ,requiredAmount,paymentToken,chain=store.selectedChain as CHAINENUMS,tradeId,purchaseId,quantity,logisticsProvider,tokenMint=TESTTOKENMINT,sellerTokenAccount,}:IBuyTrade)=>{
sellerTokenAccount = sellerTokenAccount || await solanaContract.getatatadress({tokenMint})
solanaContract.getTokenBalance
let buyer = (solanaContract?.wallet?.publicKey) as PublicKey
        switch(chain){
            case CHAINENUMS.solana:{
                let tx = await solanaContract.confirmDeliveryAndPurchase({
                    tradeId:Number(tradeId),
                    buyer :buyer||wallet.
                     publicKey,
                    purchaseId:Number(purchaseId),
                    // quantity,
                    // buyer:wallet.publicKey,
                    logisticsProvider:new PublicKey(logisticsProvider),
                    tokenMint:new PublicKey(tokenMint),
                    sellerTokenAccount:new PublicKey(sellerTokenAccount),
                    sellerAccount:new PublicKey(sellerAccount as any)

                    


                })

                if(onTxSent){
                    onTxSent({hash:tx})
                }


return {hash:tx}
          

                break

            }
            
            
            default:{
  const result = await confirmDeliveryAndPurchase(
     purchaseId.toString()
        );
           if (!result.success) {
          throw new Error(result.message || "Failed to confirm delivery");
        }
//                 if(paymentToken && requiredAmount){

//                     await ethereumContractManager.approveToken(paymentToken, requiredAmount);
//                     //  await ethereumContractManager.refreshTokenBalance();
//                 }else{
//    throw new Error("Please enter Payment token and required amount");
//                 }





  try {
          const approvalTx = await ethereumContractManager.approveToken(
            // selectedToken.symbol,
            paymentToken||"",
            (requiredAmount||"")?.toString()
          );
          if (approvalTx !== "0x0") {
            if(onTxSent){
                onTxSent(approvalTx)
            }
            // setApprovalHash(approvalTx);
            // showSnackbar(
            //   `${selectedToken.symbol} approval submitted. Waiting for confirmation...`,
            //   "info"
            // );
            let confirmed = false;
            let attempts = 0;
            const maxAttempts = 20; // 40 seconds total
            while (!confirmed && attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              try {
                const newAllowance = await ethereumContractManager.getTokenAllowance(
                //   selectedToken.symbol
                  paymentToken||""
                );
                if (newAllowance >= Number(requiredAmount)) {
                  confirmed = true;
                  break;
                }
              } catch (checkError) {
                console.warn("Allowance check failed:", checkError);
              }
              attempts++;
            }
            if (!confirmed) {
              throw new Error(
                "Approval confirmation timeout. Please try again."
              );
            }
          }
          
       
        } catch (approvalError) {
          console.error("Approval failed:", approvalError);
        //   throw new Error(`Approval failed: ${ethparseWeb3Error(approvalError)}`);
          throw new Error(`Approval failed: }`);
        }



            }

        }



        
    }
    let makeOrder=async ({requiredAmount,paymentToken,chain=store.selectedChain as CHAINENUMS,tradeId,purchaseId,quantity,logisticsProvider,tokenMint=TESTTOKENMINT,buyerTokenAccount}:IBuyTrade)=>{
buyerTokenAccount = buyerTokenAccount || await solanaContract.getatatadress({tokenMint})
solanaContract.getTokenBalance
let buyer = (solanaContract?.wallet?.publicKey) as PublicKey
        switch(chain){
            case CHAINENUMS.solana:{
                // let tx = await solanaContract.buyTrade({
                //     tradeId:Number(tradeId),
                //     buyer,
                //     purchaseId:Number(purchaseId),
                //     quantity,
                //     logisticsProvider:new PublicKey(logisticsProvider),
                //     tokenMint:new PublicKey(tokenMint),
                //     buyerTokenAccount:new PublicKey(buyerTokenAccount)

                    


                // })

          

                break

            }
            
            
            default:{
                if(paymentToken && requiredAmount){

                    await ethereumContractManager.approveToken(paymentToken, requiredAmount.toString() as string);
                    
                    //  await ethereumContractManager.refreshTokenBalance();
                }else{
   throw new Error("Please enter Payment token and required amount");
                }


            }

        }



        
    }
    let    connectWallet = async ()=>{
 switch(store.selectedChain){
           case CHAINENUMS.solana:{
           

         

               break

           }
           
           
           default:{
             

await ethereumContractManager.connectWallet()
           }

       }
       // connectWallet

       }
    let    switchToCorrectNetwork = async ()=>{
 switch(store.selectedChain){
           case CHAINENUMS.solana:{
           

         

               break

           }
           
           
           default:{
             

await ethereumContractManager.switchToCorrectNetwork()
           }

       }
       // connectWallet

       }


       let isCorrectNetwork =  useMemo(()=>{

 switch(store.selectedChain){
           case CHAINENUMS.solana:{
           
return true
         

               break

           }
           
           
           default:{
             

return ethereumContractManager.isCorrectNetwork
           }

       }

       },[


       ])

const ContractPaymentModal = useMemo(()=>{
    switch(store.selectedChain){
        case CHAINENUMS.solana:{
            return SolanaPaymentModal
        }
        case CHAINENUMS.ethereum:{
            return PaymentModal
        }
        
        default:{
            return ()=>{return <div>Unsupported Chain</div>}
        }}
    
    },[])
    return {confirmDelivery,ContractPaymentModal,makeOrder,walletBalance,switchToCorrectNetwork,isCorrectNetwork,connectWallet,getTokenBalance,buyTrade,wallet,selectedChain,walletFactory}



}