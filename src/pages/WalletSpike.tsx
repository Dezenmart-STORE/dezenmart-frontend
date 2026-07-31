/**
 * THROWAWAY SPIKE - not for production.
 *
 * Proves the Dynamic + Celo path before we wire embedded-wallet signing into
 * the real payment flow. Run it with VITE_DYNAMIC_ENV_ID set (see the runbook),
 * open /wallet-spike, and work through the buttons top to bottom.
 *
 * It answers:
 *   1. Does Dynamic boot and provision an embedded wallet?
 *   2. Is the wallet on Celo (42220) / Celo Sepolia (11142220)?
 *   3. Can it sign a message?
 *   4. Can it submit a real (0-value) transaction on Celo?
 *   5. Is the wallet an EOA or a smart account (bytecode present)?
 */
import { useState } from "react";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAccount, useChainId, useSignMessage, useSendTransaction, usePublicClient } from "wagmi";
import { CHAIN_IDS } from "../config/chains";
import { SMART_WALLET_ENABLED } from "../config/smartWallet";

const isCelo = (id?: number) => id === CHAIN_IDS.CELO || id === CHAIN_IDS.CELO_SEPOLIA;

export default function WalletSpike() {
  const { primaryWallet, user } = useDynamicContext();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { sendTransactionAsync } = useSendTransaction();

  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const add = (line: string) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l]);

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(true);
    add(`▶ ${label}…`);
    try {
      add(`✓ ${await fn()}`);
    } catch (e) {
      add(`✗ ${label} failed: ${(e as Error)?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const testSign = () =>
    run("Sign message", async () => {
      const sig = await signMessageAsync({ message: "DezenMart spike" });
      return `signature ${sig.slice(0, 14)}…${sig.slice(-8)}`;
    });

  const testSend = () =>
    run("Send 0-value tx on Celo", async () => {
      if (!address) throw new Error("no wallet address");
      const hash = await sendTransactionAsync({ to: address, value: 0n });
      return `tx submitted ${hash}`;
    });

  const testAccountType = () =>
    run("Inspect account type", async () => {
      if (!address || !publicClient) throw new Error("no client/address");
      const code = await publicClient.getCode({ address });
      return code && code !== "0x"
        ? `SMART ACCOUNT (bytecode ${code.length} chars) - 4337/7702 delegated`
        : "EOA (no bytecode) - use Celo fee-currency for gasless-in-stablecoin";
    });

  const box = "rounded-xl border border-[#2F3136] bg-[#212428] p-4";
  const btn =
    "rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50";

  return (
    <div className="min-h-screen bg-[#1A1C20] px-4 py-8 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        <div>
          <h1 className="text-xl font-bold">Dynamic × Celo spike</h1>
          <p className="text-sm text-gray-400">Throwaway harness - not production.</p>
        </div>

        {!SMART_WALLET_ENABLED ? (
          <div className={box}>
            <p className="text-sm text-yellow-400">
              Set <code className="text-white">VITE_DYNAMIC_ENV_ID</code> in your .env and restart the
              dev server to run this spike.
            </p>
          </div>
        ) : (
          <>
            <div className={box}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                1. Connect / provision wallet
              </p>
              <DynamicWidget />
            </div>

            <div className={box}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                2. Status
              </p>
              <dl className="space-y-1.5 text-sm">
                <Row k="Dynamic user" v={user?.userId ?? "-"} />
                <Row k="Primary wallet" v={primaryWallet?.address ?? "-"} mono />
                <Row k="wagmi address" v={address ?? "-"} mono />
                <Row k="Connected" v={String(isConnected)} />
                <Row
                  k="Chain"
                  v={`${chainId} ${isCelo(chainId) ? "✓ Celo" : "✗ NOT Celo"}`}
                  warn={!isCelo(chainId)}
                />
              </dl>
            </div>

            <div className={box}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                3. Tests
              </p>
              <div className="flex flex-wrap gap-2">
                <button className={btn} disabled={busy || !isConnected} onClick={testSign}>
                  Sign message
                </button>
                <button className={btn} disabled={busy || !isConnected} onClick={testSend}>
                  Send 0-value tx
                </button>
                <button className={btn} disabled={busy || !isConnected} onClick={testAccountType}>
                  EOA or smart account?
                </button>
              </div>
            </div>

            <div className={box}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Log</p>
              <div className="max-h-72 space-y-1 overflow-y-auto font-mono text-xs text-gray-300">
                {log.length === 0 ? <p className="text-gray-600">No output yet.</p> : log.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, mono, warn }: { k: string; v: string; mono?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex-shrink-0 text-gray-500">{k}</dt>
      <dd className={`text-right ${mono ? "break-all font-mono text-xs" : ""} ${warn ? "text-yellow-400" : "text-white"}`}>
        {v}
      </dd>
    </div>
  );
}
