// Premium SVG Icons for Categories
import React from "react";

interface IconProps {
  className?: string;
}

export const ElectronicsIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="12" width="48" height="32" rx="2" stroke="currentColor" strokeWidth="2.5" fill="none"/>
    <rect x="12" y="16" width="40" height="24" rx="1" fill="currentColor" opacity="0.1"/>
    <path d="M24 44L20 52H44L40 44H24Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
    <line x1="16" y1="52" x2="48" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="32" cy="28" r="6" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2"/>
    <path d="M38 22L42 18M26 22L22 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const ClothingIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 12L24 8L32 14L40 8L44 12L48 16V28H16V16L20 12Z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.1" strokeLinejoin="round"/>
    <path d="M16 28V56H48V28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="32" cy="14" r="4" fill="currentColor" opacity="0.2"/>
    <line x1="24" y1="36" x2="40" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
    <line x1="24" y1="44" x2="40" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
  </svg>
);

export const HomeGardenIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8L56 28H52V56H12V28H8L32 8Z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.1" strokeLinejoin="round"/>
    <rect x="24" y="38" width="16" height="18" stroke="currentColor" strokeWidth="2.5" fill="none"/>
    <rect x="20" y="24" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
    <rect x="34" y="24" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M28 48V56M36 48V56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
  </svg>
);

export const BeautyIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 8H36L38 24H26L28 8Z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.1" strokeLinejoin="round"/>
    <ellipse cx="32" cy="24" rx="12" ry="4" stroke="currentColor" strokeWidth="2.5" fill="none"/>
    <path d="M20 24C20 28 24 48 24 52C24 54 26 56 32 56C38 56 40 54 40 52C40 48 44 28 44 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="28" cy="36" r="2" fill="currentColor" opacity="0.4"/>
    <circle cx="36" cy="40" r="2" fill="currentColor" opacity="0.4"/>
    <path d="M30 44C30 44 30 46 32 46C34 46 34 44 34 44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const SportsIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2.5" fill="none"/>
    <circle cx="32" cy="32" r="20" fill="currentColor" opacity="0.05"/>
    <path d="M32 12C38 12 44 16 48 22M16 22C20 16 26 12 32 12M32 52C26 52 20 48 16 42M48 42C44 48 38 52 32 52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="32" cy="32" rx="8" ry="20" stroke="currentColor" strokeWidth="2" fill="none"/>
    <ellipse cx="32" cy="32" rx="20" ry="8" stroke="currentColor" strokeWidth="2" fill="none"/>
    <circle cx="32" cy="32" r="4" fill="currentColor" opacity="0.3"/>
  </svg>
);

export const ArtWorkIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="8" width="40" height="48" rx="2" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.05"/>
    <path d="M18 16H46M18 50H46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
    <circle cx="28" cy="28" r="6" stroke="currentColor" strokeWidth="2.5" fill="none"/>
    <circle cx="28" cy="28" r="3" fill="currentColor" opacity="0.2"/>
    <path d="M18 50L28 36L34 42L46 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <rect x="38" y="20" width="6" height="6" rx="1" fill="currentColor" opacity="0.3"/>
  </svg>
);

export const AccessoriesIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 20L20 12H44L48 20L44 28H20L16 20Z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.1" strokeLinejoin="round"/>
    <rect x="20" y="28" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2.5" fill="none"/>
    <circle cx="32" cy="40" r="6" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2"/>
    <path d="M26 16L28 20M32 16V20M38 16L36 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <rect x="28" y="34" width="8" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);

export const CategoryIcons = {
  Electronics: ElectronicsIcon,
  Clothing: ClothingIcon,
  "Home & Garden": HomeGardenIcon,
  "Beauty & Personal Care": BeautyIcon,
  "Sports & Outdoors": SportsIcon,
  "Art Work": ArtWorkIcon,
  Accessories: AccessoriesIcon,
};
