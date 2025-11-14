/**
 * FAQ Data for DezenMart
 *
 * Common questions about Web3 shopping, crypto payments, and the platform
 */

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    question: "What is DezenMart?",
    answer: "DezenMart is a Web3 marketplace that allows you to buy and sell products using cryptocurrency. We support 16+ stablecoins including USDT, cUSD, cEUR, and GoodDollar. All transactions are secured with smart contract escrow protection on the Celo blockchain.",
    category: "Getting Started",
  },
  {
    question: "How do I start shopping on DezenMart?",
    answer: "To start shopping, first connect your crypto wallet (MetaMask, Coinbase Wallet, or WalletConnect). Browse our products, add items to your cart, and checkout using your preferred stablecoin. Your funds are held in escrow until you confirm delivery.",
    category: "Getting Started",
  },
  {
    question: "Do I need cryptocurrency to use DezenMart?",
    answer: "Yes, DezenMart operates exclusively with cryptocurrency payments. You'll need a Web3 wallet with stablecoins like USDT, cUSD, or other supported tokens. This ensures fast, secure, and decentralized transactions without traditional payment processors.",
    category: "Getting Started",
  },

  // Payments & Crypto
  {
    question: "What cryptocurrencies does DezenMart accept?",
    answer: "We accept 16+ stablecoins on the Celo blockchain, including USDT, cUSD, cEUR, cREAL, cKES, GoodDollar (G$), and more. Stablecoins maintain a stable value pegged to fiat currencies, making them ideal for everyday purchases.",
    category: "Payments",
  },
  {
    question: "Why use stablecoins instead of regular crypto?",
    answer: "Stablecoins like USDT and cUSD are pegged to traditional currencies (1 USDT ≈ 1 USD), so their value doesn't fluctuate wildly like Bitcoin or Ethereum. This makes them perfect for shopping since the price you see is the price you pay.",
    category: "Payments",
  },
  {
    question: "Are there any transaction fees?",
    answer: "DezenMart charges a small 2.5% escrow fee to ensure transaction security. Blockchain network fees (gas fees) are minimal on Celo, typically less than $0.01 per transaction. There are no hidden fees or credit card processing charges.",
    category: "Payments",
  },
  {
    question: "How do I get cryptocurrency if I don't have any?",
    answer: "You can buy cryptocurrency on exchanges like Coinbase, Binance, or Kraken. Once purchased, transfer your stablecoins to your Web3 wallet (like MetaMask). Alternatively, you can use on-ramp services that allow direct purchase with a credit/debit card.",
    category: "Payments",
  },

  // Security & Escrow
  {
    question: "How does escrow protection work?",
    answer: "When you make a purchase, your payment is held in a smart contract escrow. The seller doesn't receive funds until you confirm delivery. If there's a dispute, our resolution system ensures fair outcomes. This protects both buyers and sellers.",
    category: "Security",
  },
  {
    question: "Is DezenMart safe to use?",
    answer: "Yes! DezenMart uses blockchain technology and smart contracts to ensure secure, transparent transactions. All payments are held in escrow, your wallet keys remain with you (we never control your funds), and transactions are immutable on the Celo blockchain.",
    category: "Security",
  },
  {
    question: "What happens if I don't receive my order?",
    answer: "If you don't receive your order or it's not as described, you can open a dispute before confirming delivery. Your funds remain in escrow during the dispute resolution process. Our team investigates and ensures fair resolution based on evidence provided.",
    category: "Security",
  },
  {
    question: "Can I cancel an order after payment?",
    answer: "Once a payment is made, the order is final. However, if the seller hasn't shipped the item yet, you can contact them directly to request cancellation. If agreed, the seller can initiate a refund from the escrow contract.",
    category: "Security",
  },

  // Wallets & Web3
  {
    question: "What is a Web3 wallet?",
    answer: "A Web3 wallet (like MetaMask or Coinbase Wallet) is a digital wallet that stores your cryptocurrency and allows you to interact with blockchain applications. It's like a digital bank account that you fully control, without needing a traditional bank.",
    category: "Wallets",
  },
  {
    question: "Which wallets are supported?",
    answer: "DezenMart supports MetaMask, Coinbase Wallet, and any wallet compatible with WalletConnect. These wallets work on desktop browsers, mobile devices, and as browser extensions. You maintain full control of your wallet keys at all times.",
    category: "Wallets",
  },
  {
    question: "Do I need a different wallet for Celo?",
    answer: "No! Most Ethereum-compatible wallets (like MetaMask) can be configured to work with Celo. When you connect your wallet to DezenMart, we'll automatically prompt you to add the Celo network if it's not already configured.",
    category: "Wallets",
  },

  // Selling on DezenMart
  {
    question: "How do I sell products on DezenMart?",
    answer: "To sell on DezenMart, create an account, verify your identity (for security), and list your products with photos, descriptions, and prices in USD. When someone buys your product, ship it and provide tracking. Confirm delivery to release escrow funds to your wallet.",
    category: "Selling",
  },
  {
    question: "What fees do sellers pay?",
    answer: "Sellers pay a 2.5% transaction fee on each sale. This covers escrow services, platform maintenance, and dispute resolution. There are no listing fees, monthly subscriptions, or hidden charges. You only pay when you make a sale.",
    category: "Selling",
  },
  {
    question: "How do I receive payments as a seller?",
    answer: "When a buyer confirms delivery, funds are released from escrow directly to your connected wallet. You receive payment in the stablecoin the buyer used (USDT, cUSD, etc.). You can then hold, trade, or withdraw to an exchange.",
    category: "Selling",
  },

  // Shipping & Delivery
  {
    question: "How does shipping work?",
    answer: "Sellers handle shipping directly. After purchase, the seller ships your order and provides tracking information. As a buyer, you can track your order status in your account. Confirm delivery once you receive the product to release escrow funds.",
    category: "Shipping",
  },
  {
    question: "Does DezenMart ship internationally?",
    answer: "Shipping depends on individual sellers. Many sellers offer international shipping. Check the product listing for shipping options and costs. Cryptocurrency payments work globally, making international transactions seamless without currency conversion fees.",
    category: "Shipping",
  },

  // Troubleshooting
  {
    question: "Why can't I connect my wallet?",
    answer: "Make sure you have a Web3 wallet installed (MetaMask, Coinbase Wallet, etc.) and unlocked. Clear your browser cache, disable conflicting browser extensions, and ensure you're on the correct network (Celo). If issues persist, try a different browser or device.",
    category: "Troubleshooting",
  },
  {
    question: "My transaction is stuck or pending. What do I do?",
    answer: "Blockchain transactions can occasionally take time during network congestion. Check your wallet for transaction status. On Celo, transactions usually confirm within seconds. If stuck for over 5 minutes, contact support with your transaction hash.",
    category: "Troubleshooting",
  },
];

/**
 * Get FAQs by category
 */
export const getFAQsByCategory = (category: string): FAQItem[] => {
  return FAQ_DATA.filter(faq => faq.category === category);
};

/**
 * Get all unique categories
 */
export const getFAQCategories = (): string[] => {
  return Array.from(new Set(FAQ_DATA.map(faq => faq.category)));
};

/**
 * Search FAQs by keyword
 */
export const searchFAQs = (keyword: string): FAQItem[] => {
  const lowerKeyword = keyword.toLowerCase();
  return FAQ_DATA.filter(
    faq =>
      faq.question.toLowerCase().includes(lowerKeyword) ||
      faq.answer.toLowerCase().includes(lowerKeyword)
  );
};
