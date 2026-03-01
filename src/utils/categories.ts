import type { ComponentType } from 'react';
import {
  ElectronicsIcon,
  ClothingIcon,
  HomeGardenIcon,
  BeautyIcon,
  SportsIcon,
  ArtWorkIcon,
  AccessoriesIcon,
} from '../components/common/CategoryIcons';

export interface CategoryDef {
  /** Display name — used for API queries and UI labels */
  name: string;
  /** Icon component */
  Icon: ComponentType<{ className?: string }>;
  /** Tailwind text-* class for icon tint */
  color: string;
  /** Tailwind bg-* class for icon bubble background */
  bg: string;
  /** Tailwind ring-* class shown when this category is active */
  ring: string;
  /** Hex accent for gradient headers (category page hero) */
  hex: string;
}

export const CATEGORIES: readonly CategoryDef[] = [
  {
    name: 'Electronics',
    Icon: ElectronicsIcon,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    ring: 'ring-blue-500/50',
    hex: '#3b82f6',
  },
  {
    name: 'Clothing',
    Icon: ClothingIcon,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    ring: 'ring-purple-500/50',
    hex: '#a855f7',
  },
  {
    name: 'Home & Garden',
    Icon: HomeGardenIcon,
    color: 'text-green-400',
    bg: 'bg-green-500/15',
    ring: 'ring-green-500/50',
    hex: '#22c55e',
  },
  {
    name: 'Beauty & Personal Care',
    Icon: BeautyIcon,
    color: 'text-pink-400',
    bg: 'bg-pink-500/15',
    ring: 'ring-pink-500/50',
    hex: '#ec4899',
  },
  {
    name: 'Sports & Outdoors',
    Icon: SportsIcon,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    ring: 'ring-orange-500/50',
    hex: '#f97316',
  },
  {
    name: 'Art Work',
    Icon: ArtWorkIcon,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    ring: 'ring-amber-500/50',
    hex: '#f59e0b',
  },
  {
    name: 'Accessories',
    Icon: AccessoriesIcon,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    ring: 'ring-rose-500/50',
    hex: '#f43f5e',
  },
] as const;

/** Canonical URL for a category page */
export const categoryHref = (name: string): string =>
  `/product/category/${encodeURIComponent(name.toLowerCase())}`;

/** Find category by display name (case-insensitive) */
export const getCategoryByName = (name: string): CategoryDef | undefined =>
  CATEGORIES.find((c) => c.name.toLowerCase() === name.toLowerCase());

/** All category names as a plain string array */
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);
