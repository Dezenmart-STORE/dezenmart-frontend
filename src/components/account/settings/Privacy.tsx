import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiaAngleLeftSolid } from 'react-icons/lia';
import { HiChevronDown, HiOutlineMail } from 'react-icons/hi';

interface Section {
  title: string;
  content: string;
}

const SECTIONS: Section[] = [
  {
    title: 'What we collect',
    content:
      'We collect your Google email address, display name, and profile photo for account creation. Your Celo wallet address is stored when you connect a wallet. We also log transaction activity (trades, orders, payments) to fulfil the service and prevent fraud.',
  },
  {
    title: 'How we use your data',
    content:
      'Your data is used to process trades and orders through our smart contract escrow, send order and message notifications, calculate referral rewards, and improve the platform. We never sell your data to third parties.',
  },
  {
    title: 'Who we share data with',
    content:
      'Blockchain transactions are publicly visible on Celo. Logistics providers receive your delivery address only after an order is confirmed. We use Thirdweb and WalletConnect for wallet integration — each governed by their own privacy policies.',
  },
  {
    title: 'Your rights',
    content:
      'You can request a copy of your data, correct inaccurate information via Edit Profile, or delete your account at any time. Deleted accounts are purged from our servers within 30 days. Blockchain records are permanent by design.',
  },
  {
    title: 'Data security',
    content:
      'All API traffic is encrypted over HTTPS/TLS. Authentication tokens are stored in secure browser storage and expire automatically. We never store private keys or seed phrases — these remain exclusively in your wallet.',
  },
];

const AccordionItem = ({ title, content }: Section) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#3A3A3C] last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-white">{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <HiChevronDown className="text-gray-400 w-4 h-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-sm text-gray-400 leading-relaxed">{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Privacy = ({ onBack }: { onBack: () => void }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
    {/* Header */}
    <div className="flex items-center gap-3 mb-6">
      <button
        aria-label="Back"
        onClick={onBack}
        className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
      >
        <LiaAngleLeftSolid className="text-white text-xl" />
      </button>
      <h2 className="text-xl font-bold text-white">Privacy</h2>
    </div>

    {/* Intro */}
    <p className="text-sm text-gray-400 mb-5 leading-relaxed">
      We believe your data belongs to you. Here's an honest breakdown of how Dezenmart handles your information.
    </p>

    {/* Accordion */}
    <div className="bg-[#292B30] rounded-xl overflow-hidden mb-5">
      {SECTIONS.map((s) => (
        <AccordionItem key={s.title} {...s} />
      ))}
    </div>

    {/* Contact */}
    <a
      href="mailto:privacy@dezenmart.io"
      className="flex items-center gap-3 bg-[#292B30] rounded-xl px-4 py-4 hover:bg-[#333940] transition-colors"
    >
      <div className="p-2 rounded-full bg-[#3A3A3C]">
        <HiOutlineMail className="text-white text-base" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">Privacy questions?</p>
        <p className="text-xs text-gray-400">privacy@dezenmart.io</p>
      </div>
    </a>
  </motion.div>
);

export default Privacy;
