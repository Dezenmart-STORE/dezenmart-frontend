/**
 * SEO Configuration
 * Central configuration for all SEO-related settings
 */

export const SEO_CONFIG = {
  // Site Information
  siteName: "DezenMart",
  siteUrl: "https://dezenmart.com",
  defaultTitle: "DezenMart - Secure Web3 Marketplace | Buy & Sell with Crypto",
  titleTemplate: "%s | DezenMart",
  defaultDescription:
    "Shop securely with cryptocurrency on DezenMart. Buy and sell products using stablecoins (USDT, cUSD, G$) with escrow protection. Web3 marketplace on Celo blockchain.",
  defaultKeywords: [
    "web3 marketplace",
    "crypto marketplace",
    "buy with crypto",
    "sell with cryptocurrency",
    "stablecoin payments",
    "USDT marketplace",
    "cUSD marketplace",
    "GoodDollar marketplace",
    "escrow protection",
    "Celo marketplace",
    "decentralized shopping",
    "blockchain ecommerce",
    "crypto shopping",
    "peer to peer marketplace",
    "secure crypto payments",
  ],

  // Social Media
  social: {
    twitter: "@Dezenmart",
    twitterCreator: "@Dezenmart",
    // We only use X and LinkedIn.
    // facebook: "dezenmart",
    // instagram: "dezenmart",
    linkedin: "company/dezenmart",
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "DezenMart",
    images: {
      default: "/images/logo-full.png", // 1200x630px
      logo: "/images/logo.svg",
    },
  },

  // Twitter Card
  twitterCard: {
    cardType: "summary_large_image",
    site: "@dezenmart",
    creator: "@dezenmart",
  },

  // Verification
  verification: {
    google: "your-google-verification-code", // Add Google Search Console verification
    bing: "your-bing-verification-code", // Add Bing Webmaster verification
  },

  // Organization Schema
  organization: {
    name: "DezenMart",
    legalName: "DezenMart Inc.",
    url: "https://dezenmart.com",
    logo: "https://dezenmart.com/images/logo.svg",
    foundingDate: "2024",
    founders: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "support@dezenmart.com",
      availableLanguage: ["English"],
    },
    sameAs: [
      "https://x.com/Dezenmart",
      // We only use X and LinkedIn.
      // "https://facebook.com/dezenmart",
      // "https://instagram.com/dezenmart",
      "https://linkedin.com/company/dezenmart",
    ],
  },

  // Breadcrumb
  breadcrumb: {
    showOnAllPages: true,
    separator: "›",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    maxSnippet: -1,
    maxImagePreview: "large",
    maxVideoPreview: -1,
  },
} as const;

/**
 * Page-specific SEO configurations
 */
export const PAGE_SEO: Record<
  string,
  {
    title: string;
    description: string;
    keywords?: string[];
    noindex?: boolean;
  }
> = {
  home: {
    title: "Secure Web3 Marketplace",
    description:
      "Discover the future of online shopping with DezenMart. Buy and sell products securely using stablecoins like USDT, cUSD, and GoodDollar. Enjoy escrow protection and instant crypto payments on the Celo blockchain.",
    keywords: [
      "web3 marketplace",
      "crypto marketplace",
      "buy with cryptocurrency",
      "stablecoin shopping",
      "decentralized marketplace",
      "Celo blockchain",
    ],
  },
  products: {
    title: "Browse Products",
    description:
      "Explore thousands of products available for purchase with cryptocurrency. Shop securely with USDT, cUSD, cEUR, and 16+ stablecoins. Escrow protection on every order.",
    keywords: [
      "crypto products",
      "buy products with crypto",
      "cryptocurrency shopping",
      "stablecoin products",
    ],
  },
  login: {
    title: "Sign In - Access Your Web3 Marketplace Account",
    description:
      "Sign in to DezenMart to manage your orders, track purchases, and shop with cryptocurrency. Secure authentication with Google.",
    noindex: true, // Don't index login pages
  },
  account: {
    title: "My Account - Manage Orders & Profile",
    description:
      "Manage your DezenMart account, view order history, track deliveries, and update your preferences.",
    noindex: true, // User-specific pages
  },
  trades: {
    title: "My Trades - Active & Completed Orders",
    description:
      "View your active and completed trades on DezenMart. Track order status, confirm deliveries, and manage escrow payments.",
    noindex: true,
  },
  community: {
    title: "Community - Connect with Web3 Shoppers",
    description:
      "Join the DezenMart community. Connect with other crypto enthusiasts, share experiences, and discover new products.",
  },
  referral: {
    title: "Referral Program - Earn Crypto Rewards",
    description:
      "Invite friends to DezenMart and earn crypto rewards. Get paid in stablecoins for every successful referral. Start earning today!",
    keywords: [
      "crypto referral program",
      "earn cryptocurrency",
      "crypto rewards",
      "referral earnings",
    ],
  },
};

/**
 * Generate canonical URL
 */
export const getCanonicalUrl = (path: string): string => {
  const cleanPath = path.replace(/\/$/, ""); // Remove trailing slash
  return `${SEO_CONFIG.siteUrl}${cleanPath}`;
};

/**
 * Generate structured data for products
 */
export const generateProductSchema = (product: {
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category?: string;
  seller?: { name: string };
  rating?: number;
  reviewCount?: number;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "USD",
      availability: "https://schema.org/InStock",
      priceValidUntil: `${new Date().getFullYear()}-12-31`,
      seller: {
        "@type": "Organization",
        name: product.seller?.name || "DezenMart Seller",
      },
    },
    ...(product.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 0,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(product.category && {
      category: product.category,
    }),
  };
};

/**
 * Generate breadcrumb structured data
 */
export const generateBreadcrumbSchema = (
  items: Array<{ name: string; url: string }>
) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

/**
 * Generate FAQ structured data
 */
export const generateFAQSchema = (
  faqs: Array<{ question: string; answer: string }>
) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
};

/**
 * Generate review structured data
 */
export const generateReviewSchema = (review: {
  author: string;
  rating: number;
  reviewBody: string;
  datePublished: string;
  productName?: string;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    ...(review.productName && {
      itemReviewed: {
        "@type": "Product",
        name: review.productName,
      },
    }),
    author: {
      "@type": "Person",
      name: review.author,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.reviewBody,
    datePublished: review.datePublished,
  };
};

/**
 * Generate multiple reviews with aggregate rating
 */
export const generateAggregateReviewSchema = (reviews: Array<{
  author: string;
  rating: number;
  reviewBody: string;
  datePublished: string;
}>, product: {
  name: string;
  averageRating: number;
  reviewCount: number;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.map(review => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.author,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.reviewBody,
      datePublished: review.datePublished,
    })),
  };
};

/**
 * Generate HowTo structured data
 */
export const generateHowToSchema = (howTo: {
  name: string;
  description: string;
  totalTime?: string; // ISO 8601 duration format (PT30M = 30 minutes)
  steps: Array<{
    name: string;
    text: string;
    image?: string;
    url?: string;
  }>;
  image?: string[];
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howTo.name,
    description: howTo.description,
    ...(howTo.totalTime && { totalTime: howTo.totalTime }),
    ...(howTo.image && { image: howTo.image }),
    step: howTo.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
      ...(step.url && { url: step.url }),
    })),
  };
};

/**
 * Generate Offer structured data (for promotions/deals)
 */
export const generateOfferSchema = (offer: {
  name: string;
  description: string;
  price: number;
  currency: string;
  validFrom: string;
  validThrough: string;
  availability?: string;
  seller?: string;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: offer.name,
    description: offer.description,
    price: offer.price,
    priceCurrency: offer.currency,
    priceValidUntil: offer.validThrough,
    validFrom: offer.validFrom,
    availability: offer.availability || "https://schema.org/InStock",
    seller: {
      "@type": "Organization",
      name: offer.seller || "DezenMart",
    },
  };
};

/**
 * Generate VideoObject structured data
 */
export const generateVideoSchema = (video: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  contentUrl: string;
  embedUrl?: string;
  duration?: string; // ISO 8601 duration format
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    contentUrl: video.contentUrl,
    ...(video.embedUrl && { embedUrl: video.embedUrl }),
    ...(video.duration && { duration: video.duration }),
  };
};

/**
 * Generate WebSite schema with sitelinks searchbox
 */
export const generateWebSiteSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_CONFIG.siteName,
    url: SEO_CONFIG.siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SEO_CONFIG.siteUrl}/product?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
};

/**
 * Generate Organization schema from central config
 */
export const generateOrganizationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_CONFIG.organization.name,
    legalName: SEO_CONFIG.organization.legalName,
    url: SEO_CONFIG.organization.url,
    logo: {
      "@type": "ImageObject",
      url: SEO_CONFIG.organization.logo,
    },
    foundingDate: SEO_CONFIG.organization.foundingDate,
    contactPoint: SEO_CONFIG.organization.contactPoint,
    sameAs: SEO_CONFIG.organization.sameAs,
  };
};
