// ─── App.tsx (root) ───────────────────────────────────────────────────────
import { RampProvider, RampModal, FloatingRampButton } from "./ramp";

export default function App() {
  return (
    // 1. Wrap your app (or a section of it) with RampProvider
    <RampProvider
      defaultCustomer={{
        email: "user@dezenmart.io",
        first_name: "John",
        last_name: "Doe",
      }}
    >
      {/* 2. Render RampModal once — it self-manages visibility */}
      <RampModal />

      {/* 3. Optional: floating button always visible */}
      <FloatingRampButton
        defaultMode="onramp"
        position="bottom-right"
        label="Buy / Sell Crypto"
      />

      {/* Your app routes / pages */}
      <YourRoutes />
    </RampProvider>
  );
}

// ─── Trigger from any component without the floating button ───────────────
import { useRamp } from "./ramp";

export const WalletCard = () => {
  const { openRamp } = useRamp();

  return (
    <div className="wallet-card">
      <button onClick={() => openRamp("onramp")}>
        Buy Crypto
      </button>
      <button onClick={() => openRamp("offramp")}>
        Sell Crypto
      </button>

      {/* Or with a specific customer override */}
      <button
        onClick={() =>
          openRamp("onramp", {
            email: "jane@example.com",
            first_name: "Jane",
            last_name: "Smith",
          })
        }
      >
        Quick Buy (Jane)
      </button>
    </div>
  );
};

// ─── Hide the FAB and only use programmatic triggering ────────────────────
export const NoFABExample = () => (
  <RampProvider>
    <RampModal />
    <FloatingRampButton hidden />   {/* renders nothing */}
    <TriggerFromModal />
  </RampProvider>
);

const TriggerFromModal = () => {
  const { openRamp } = useRamp();
  return (
    <SomeOtherModal>
      <button onClick={() => openRamp("offramp")}>
        Withdraw to bank
      </button>
    </SomeOtherModal>
  );
};
