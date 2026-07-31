import { RiWallet3Line, RiShieldCheckLine, RiFlashlightLine } from "react-icons/ri";
import ModalShell from "./ModalShell";

interface Props {
  /** True while the wallet is still being provisioned/linked. */
  provisioning: boolean;
  walletAddress: string | null;
  onClose: () => void;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/**
 * One-time welcome shown to a new user once their DezenMart wallet is ready.
 * No PIN step - wallet security is handled by Dynamic's passcode (per session).
 */
export default function WalletWelcomeModal({ provisioning, walletAddress, onClose }: Props) {
  return (
    <ModalShell
      title="Your DezenMart wallet is ready"
      subtitle="A secure in-app wallet, created just for you. Use it to pay and get paid across DezenMart."
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          disabled={provisioning}
          className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {provisioning ? "Setting things up…" : "Get started"}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-[#292B30] p-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-600/15">
            <RiWallet3Line className="text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">Your wallet</p>
            <p className="truncate font-mono text-xs text-gray-400">
              {walletAddress ? short(walletAddress) : "Creating…"}
            </p>
          </div>
        </div>

        <Feature icon={<RiShieldCheckLine />} title="Yours alone" text="Self-custodial and protected by a passcode on new devices." />
        <Feature icon={<RiFlashlightLine />} title="No seed phrase" text="Just sign in - no keys to write down or lose." />

        <p className="mt-1 text-center text-xs text-gray-500">
          Prefer your own wallet? You can connect an external one any time.
        </p>
      </div>
    </ModalShell>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 px-1">
      <span className="mt-0.5 text-green-400">{icon}</span>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-gray-400">{text}</p>
      </div>
    </div>
  );
}
