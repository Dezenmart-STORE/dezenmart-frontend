// App.tsx (React + TSX)
import React, { useMemo, useCallback } from "react";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  
  useAnchorWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";

// import idl from "../../../dezenmart_rust_smart_contract/target/idl/dezenmart_logistics.json"; // drop idl into your src
import idl from "../idl/dezenmart_logistics.json"; // drop idl into your src
import { Account, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress, getMint, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
const SOLANAPROGRAMID = anchor.web3.SystemProgram.programId
// const TOKENPROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXuAYJkmXvzJvmfK57a")
const TOKENPROGRAM = TOKEN_PROGRAM_ID;
export const TESTTOKENMINT = new PublicKey("Do1mZe9KZxnn4XdEQm53srKvbpSo8ae7BitH4L9UEXv9")
export const TESTTOKENACCOUNT = new PublicKey("5EHhG8Pd4HA4myMgQ4wFTqhRvvrMSAsTCqNFJfhh32mk")
export const TESTACCOUNT = new PublicKey("BTd1DEeDRkfFV6K1BXPTJG6PXxLhS3tMsiSYoJtoidv5")
// const RPC_URL = "http://127.0.0.1:8899";
const RPC_URL = "https://api.devnet.solana.com";
 // or "http://127.0.0.1:8899" for local
const PROGRAM_ID = new PublicKey(idl.address);     // idl.address must be present
import secretArray from ".././id.json" with { type: "json" };
import { LocalWallet } from "./wallet";
// Helper: create an Anchor Program instance from anchored wallet
const secretKey = Uint8Array.from(secretArray as number[]);
 const testWallet = Keypair.fromSecretKey(secretKey);
function useAnchorProgram() {
  //  const wallet = new LocalWallet(testWallet);
// const wallet:any = new anchor.Wallet(testWallet);
//      const NodeWallet:any = anchor.Wallet.local().constructor;
// const wallet = new NodeWallet(testWallet);
  const wallet = useAnchorWallet(); // provided by wallet adapter react
  // const wallet = testWallet; // provided by wallet adapter react
  const connection = new Connection(RPC_URL, "confirmed");

  return useMemo(() => {
    if (!wallet) return null;
    // Anchor expects a provider object with .connection and .wallet
    const provider = new anchor.AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);
    // If idl contains address, you can: new anchor.Program(idl, provider)
    // In v0.30+, Program constructor can be (idl, provider)
    return new anchor.Program(idl as anchor.Idl, provider) as anchor.Program;
  }, [wallet]);
}

// function MakeTradeButton() {
//   const wallet = useAnchorWallet();
//   const program = useAnchorProgram();
//   const provider = program?.provider as anchor.AnchorProvider | undefined;

//   const onClick = useCallback(async () => {
//     if (!program || !wallet || !provider) {
//       alert("Connect wallet first");
//       return;
//     }

//     // Example: initialize global state PDA
//     const [globalStatePda] = PublicKey.findProgramAddressSync(
//       [Buffer.from("global_state")],
//       program.programId
//     );

//     try {
//       const txSignature = await program.methods
//         .initialize()
//         .accounts({
//           globalState: globalStatePda,
//           admin: provider.wallet.publicKey,
//           systemProgram: SystemProgram.programId,
//         })
//         // no .signers([]) needed — wallet signs
//         .rpc();
//       console.log("initialize tx:", txSignature);
//       alert("initialize sent: " + txSignature);
//     } catch (err) {
//       console.error("init failed:", err);
//       alert("init failed: " + JSON.stringify(err));
//     }
//   }, [program]);

//   return <button onClick={onClick}>Call initialize()</button>;
// }

export const useSolanaContract = ()=>{


      const wallet:any = useAnchorWallet()
//       const NodeWallet:any = anchor.Wallet.constructor;
// const wallet = new NodeWallet(testWallet);
  //  const wallet = new LocalWallet(testWallet);
      // const wallet = testWallet;

      const program = useAnchorProgram();


  const provider = program?.provider as anchor.AnchorProvider | undefined;

    const [globalStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("global_state")],
 ( program?.programId || TESTACCOUNT)as PublicKey

  
  
);

let getatatadress = async ({tokenMint,owner=wallet.publicKey}:{tokenMint: PublicKey|string, owner?: PublicKey|string})=>{
   return await getAssociatedTokenAddress(new PublicKey(tokenMint) as any, new PublicKey(owner) as any);
}

  let  getTokenBalance_ = async({tokenMint,owner,ata}:{tokenMint?: PublicKey, owner?: PublicKey,ata?:PublicKey})=> {
  //  if(ata)
   
     ata = ata || await getAssociatedTokenAddress(tokenMint as any, owner as any);
    try {
      const account = await getAccount(provider?.connection as any, ata);
      return account.amount;
    } catch {
      return 0n; // account does not exist
    }
  }

  async function getTokenBalance({
  tokenMint,
  owner,
  ata,
  // connection,
}: {
  tokenMint: PublicKey;
  owner: PublicKey;
  ata?: PublicKey;
  // connection: Connection;
}) {

  let connection = provider?.connection
  ata = ata || (await getAssociatedTokenAddress(tokenMint, owner||wallet.publicKey));
 
  try {
    const account = await getAccount(connection as any, ata);
   
    const mintInfo = await getMint(connection as any, tokenMint);
 
    const decimals = mintInfo.decimals;
    const uiAmount = Number(account.amount) / 10 ** decimals;

    return { raw: account.amount, uiAmount, decimals };
  } catch(e) {

    console.log("Error in getTokenBalance:", e);
    return { raw: 0n, uiAmount: 0, decimals: 0 };
  }
}
  let  getEvent = async (event_:string,tx:string)=>{
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const txDetails = await provider?.connection.getTransaction(
    tx, 
    { commitment: "confirmed" }
);
    const logs = txDetails?.meta?.logMessages || [];
const eventParser = new anchor.EventParser(program?.programId as any,program?.coder as any);
const events = eventParser.parseLogs(logs);

for (const event of events) {

    if (event.name === event_) {
     
        // console.log("Trade ID from logs:", event.data.tradeId.toNumber());
        // console.log("Trade PDA from logs:", event.data.tradePda.toBase58());
        // const event__ = this.program.coder.events?.decode("tradeCreated");
        // Handle your event data
        return event.data
    }
}

  

  }
    // class SolanaCon

 let u64ToBufferLE=(num: number | bigint): Buffer=> {
  const buf = Buffer.alloc(8); // 8 bytes for u64
  buf.writeBigUInt64LE(BigInt(Number(num)), 0);
  return buf;
}

   let buyTrade =   async (
   {tradeId,purchaseId,buyer,quantity,logisticsProvider
    ,
    tokenMint,
    buyerTokenAccount
  
  }:{ tradeId:number,
    buyer: PublicKey,
    purchaseId:number,
    quantity: number,
    logisticsProvider: PublicKey,
    tokenMint: PublicKey
    buyerTokenAccount: PublicKey
  }
  ) =>{

                const [tradePDA,bump] = anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("trade")
    ,
    
    // Buffer.from()
u64ToBufferLE(tradeId)
// tradeIdBuffer
// new anchor.BN(891).toArray('le', 8)
    // Buffer.from(new BigUint64Array([BigInt(productId.toString())]).buffer)
  ],
  program?.programId as PublicKey

  
  
);
                const [purchasePDA,purchaseBump] = anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("purchase")
    ,
    

u64ToBufferLE(purchaseId)

  ],
  program?.programId as PublicKey

  
  
);
                const [buyerPDA,buyerBump] = anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("buyer")
    ,
    buyer.toBuffer()
   
  ],
  program?.programId as PublicKey

  
  
);


                const [escrowPDA,escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("escrow")
    ,
    tokenMint.toBuffer()
   
  ],
  program?.programId as PublicKey

  
  
);



    let tx = await program?.methods
      .buyTrade(new anchor.BN(tradeId),new anchor.BN(purchaseId) ,new anchor.BN(quantity), logisticsProvider)
      .accounts({
        buyer: buyer,
        // trade,
        tokenMint,

            //  admin:this.wallet.publicKey,
        // seller:seller,
    buyerTokenAccount:buyerTokenAccount,
        tradeAccount:tradePDA,
        buyerAccount:buyerPDA,
        escrowTokenAccount:escrowPDA,
        purchaseAccount:purchasePDA,
        globalState:globalStatePda,
        systemProgram: SOLANAPROGRAMID,
        tokenProgram:TOKENPROGRAM
    
        
      })
      .rpc();

let d = await getEvent("purchaseCreated",tx as string)


return d
  }




 let findOrCreateATA =  async  (
    // connection: Connection,
    {payer,mintAddress,ownerAddress}:
    {payer?: Keypair,
    mintAddress: PublicKey,
    ownerAddress: PublicKey}
): Promise<any> => {
    console.log(`Checking ATA for owner ${ownerAddress.toBase58()} and mint ${mintAddress.toBase58()}...`);
    
    // getOrCreateAssociatedTokenAccount handles the following steps automatically:
    // 1. Calculates the deterministic ATA address.
    // 2. Checks if the account exists on the network.
    // 3. If it doesn't exist, it builds and sends the transaction to create it.
    // 4. Returns the final, validated Account object.
    
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        provider?.connection as any,
        payer||((wallet as any)?.payer), // The Keypair that signs and pays the rent (e.g., the buyer)
        mintAddress,
        ownerAddress,
        // The last two are standard and usually not changed:
        false, // allowOwnerOffCurve: false for standard user wallets
        'confirmed',
        {},
        TOKENPROGRAM,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log(`✅ Token Account (ATA) Address: ${tokenAccount.address.toBase58()}`);
    return tokenAccount;
}





  let  confirmDeliveryAndPurchase = async ({sellerTokenAccount,tokenMint,sellerAccount,tradeId,purchaseId,buyer,logisticsProvider}:{purchaseId:number,tradeId:number,buyer:PublicKey,
    logisticsProvider:PublicKey,
    sellerTokenAccount?:PublicKey,
    sellerAccount:PublicKey,
    tokenMint:PublicKey,
  
  })=> {
                const [purchasePDA,purchaseBump] = anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("purchase")
    ,
    

u64ToBufferLE(purchaseId)

  ],
  program?.programId as any

  
  
);
                const [tradePDA,Bump] = anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("trade")
    ,
    

u64ToBufferLE(tradeId)

  ],
  program?.programId as any

  
  
);
                const [escrowPDA,escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("escrow")
    ,
    tokenMint.toBuffer()
   
  ],
   program?.programId as any

  
  
);

let logisticsTokenAccount  = await findOrCreateATA({
  mintAddress:tokenMint,
  ownerAddress:logisticsProvider


})
 sellerTokenAccount  = sellerTokenAccount || await findOrCreateATA({
  mintAddress:tokenMint,
  ownerAddress:sellerAccount


})

console.log(
  logisticsTokenAccount.address

)
console.log(
  sellerTokenAccount

)
console.log(program?.methods
      .confirmDeliveryAndPurchase)
// return;
    let tx =  await program?.methods
      .confirmDeliveryAndPurchase(new anchor.BN(purchaseId))
      .accounts({
        buyer:buyer,
        tradeAccount:tradePDA,
        purchaseAccount:purchasePDA,

        logisticsTokenAccount:logisticsTokenAccount.address,
        sellerTokenAccount:sellerTokenAccount as any,

        escrowTokenAccount:escrowPDA,
        tokenMint,
     
      //  globalState:this.globalStatePda,
        // systemProgram: SOLANAPROGRAMID,
        tokenProgram:TOKENPROGRAM
      })
      .rpc();

return tx
      // return await this.getEvent("purchaseCompletedAndConfirmed",tx)
  }




    return{
      confirmDeliveryAndPurchase,
wallet,

program,

provider,


buyTrade,

getTokenBalance,

getatatadress


    }
}

