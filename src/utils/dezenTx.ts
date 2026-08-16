import { encodeFunctionData, toHex, type Abi } from "viem";
import { wagmiConfig } from "../config/chains";
import { getWalletMode } from "../config/walletMode";

/**
 * Submitting a transaction on the Dezen (Dynamic embedded) wallet.
 *
 * Why this exists instead of wagmi's writeContract:
 *
 * viem's sendTransaction has two branches. For a JSON-RPC account it forwards
 * only the fee fields the caller passed. For a LOCAL account - which is what
 * Dynamic's WaaS signer is - it calls prepareTransactionRequest, which "assigns
 * appropriate fees" and attaches maxFeePerGas/maxPriorityFeePerGas. Dynamic then
 * merges its own fee quote, whose model carries gasPrice, into the same request.
 * The transaction ends up describing both pricing schemes at once, and viem
 * rejects it before signing:
 *
 *   `maxFeePerGas`/`maxPriorityFeePerGas` is not a valid Legacy Transaction
 *   attribute
 *
 * Pinning the type does not help: type:"legacy" makes viem supply gasPrice and
 * type:"eip1559" makes it supply the 1559 pair, so either way something is added
 * for Dynamic's quote to collide with. Both were tried and failed identically.
 *
 * So we send NOTHING about pricing. Going straight to the connector's EIP-1193
 * provider skips viem's preparation entirely, and the wallet chooses whichever
 * scheme it wants with nothing to contradict it. We still pass an explicit gas
 * LIMIT (a different concern from gas PRICE) so the wallet doesn't have to
 * re-estimate execution cost.
 *
 * The fee shown in the UI is unaffected - that estimate is for display, and it
 * never had to be the same object we submit.
 *
 * External wallets keep the normal writeContract path: they take viem's
 * JSON-RPC branch, never hit the merge, and have always worked.
 */

/** True when the Dezen embedded wallet is the active signer. */
export const isDezenSigner = (): boolean => getWalletMode() === "dezen";

interface SendArgs {
  address: `0x${string}`;
  abi: Abi | readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  /** Gas LIMIT, not price. */
  gas?: bigint;
  value?: bigint;
}

/**
 * Encode a contract call and hand it to the wallet with no fee fields attached.
 * Returns the transaction hash.
 */
export async function sendViaDezenWallet({
  address,
  abi,
  functionName,
  args,
  gas,
  value,
}: SendArgs): Promise<`0x${string}`> {
  // Read the live connection straight off the config: @wagmi/core does not
  // export getAccount in this version.
  const current = wagmiConfig.state.current;
  const connection = current ? wagmiConfig.state.connections.get(current) : undefined;
  const connector = connection?.connector;
  const from = connection?.accounts?.[0];
  if (!connector || !from) {
    throw new Error("Wallet not connected.");
  }

  const provider = (await connector.getProvider()) as {
    request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  } | undefined;
  if (!provider?.request) {
    throw new Error("Wallet provider unavailable.");
  }

  const data = encodeFunctionData({
    abi: abi as Abi,
    functionName,
    args: args as unknown[],
  });

  // Deliberately no gasPrice / maxFeePerGas / maxPriorityFeePerGas. That
  // omission is the entire point of this module.
  const tx: Record<string, string> = {
    from,
    to: address,
    data,
  };
  if (gas !== undefined) tx.gas = toHex(gas);
  if (value !== undefined && value > 0n) tx.value = toHex(value);

  const hash = (await provider.request({
    method: "eth_sendTransaction",
    params: [tx],
  })) as `0x${string}`;

  if (!hash) throw new Error("Wallet did not return a transaction hash.");
  return hash;
}
