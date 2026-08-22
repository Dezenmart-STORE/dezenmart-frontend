/**
 * Compliance kill switch for everything that moves money.
 *
 * DezenMart has not yet published a refund policy or an escrow policy, and was
 * asked to take payment features down until it does. This flag hides all of
 * them from one place: the pay step on an order, the escrow actions (confirm
 * delivery, raise dispute, cancel), wallet connection, the Quidax on/off-ramp
 * and the token swap.
 *
 * OPT-IN, deliberately. Payments appear only when VITE_PAYMENTS is exactly
 * "on", so an unset, empty or misspelled value leaves them hidden. A
 * compliance restriction must never depend on someone remembering to set a
 * variable correctly - the failure mode has to be "too restricted", never
 * "accidentally live".
 *
 * ORDERING IS INTENTIONALLY UNAFFECTED. Buyers can still place orders; they
 * simply cannot pay for one yet. That works because order creation never
 * touched the wallet: PurchaseSection's executeOrder posts product, quantity,
 * quoteId and delivery address, and nothing else. Its `isConnected` check
 * existed only so the affordability hints and the later payment step had a
 * wallet to read, so it drops away here without affecting what gets created.
 *
 * SCOPE, stated plainly: this hides the interface, it does not disable the
 * capability. The escrow contract stays deployed and the API stays reachable,
 * so anyone with a wallet and the contract address can still transact
 * directly. If the requirement is that DezenMart must not FACILITATE payment,
 * the backend needs the same treatment - the frontend is only part of that
 * answer.
 *
 * To restore: set VITE_PAYMENTS=on. Nothing was deleted, so nothing needs
 * rebuilding. Flip it back once both policies are published.
 */
export const PAYMENTS_ENABLED =
  (import.meta.env.VITE_PAYMENTS as string | undefined)?.trim().toLowerCase() === "on";
