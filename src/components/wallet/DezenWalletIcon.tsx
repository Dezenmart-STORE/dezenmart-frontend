/** Wallet-shaped DezenMart mark: red brand wallet with a card slot + coin. */
export default function DezenWalletIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#dc2626" />
      <path
        d="M7 12.5A2.5 2.5 0 0 1 9.5 10h11A2.5 2.5 0 0 1 23 12.5V13H9.5A2.5 2.5 0 0 1 7 12.5Z"
        fill="#fff"
        fillOpacity="0.85"
      />
      <rect x="7" y="12" width="18" height="11" rx="3" fill="#fff" />
      <rect x="17.5" y="15.5" width="7.5" height="4" rx="2" fill="#dc2626" fillOpacity="0.18" />
      <circle cx="20.5" cy="17.5" r="1.6" fill="#dc2626" />
    </svg>
  );
}
