import { describe, it, expect } from 'vitest';
import {
  selectProductsByCategory,
  selectRelatedProducts,
  selectActiveProducts,
  selectProductsBySeller,
} from '../store/selectors/productSelectors';
import type { RootState } from '../store/store';
import type { Product } from '../utils/types';

// Mock products data
const mockProducts: Product[] = [
  {
    _id: '1',
    name: 'Product 1',
    description: 'Description 1',
    price: 100,
    category: 'Electronics',
    seller: 'seller1',
    images: ['image1.jpg'],
    isSponsored: false,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    stock: 10,
    type: [],
    logisticsCost: [],
    paymentToken: 'cUSD',
    logisticsProviders: [],
  },
  {
    _id: '2',
    name: 'Product 2',
    description: 'Description 2',
    price: 200,
    category: 'Electronics',
    seller: 'seller2',
    images: ['image2.jpg'],
    isSponsored: false,
    isActive: true,
    createdAt: '2024-01-02',
    updatedAt: '2024-01-02',
    stock: 20,
    type: [],
    logisticsCost: [],
    paymentToken: 'cUSD',
    logisticsProviders: [],
  },
  {
    _id: '3',
    name: 'Product 3',
    description: 'Description 3',
    price: 300,
    category: 'Clothing',
    seller: 'seller1',
    images: ['image3.jpg'],
    isSponsored: false,
    isActive: false,
    createdAt: '2024-01-03',
    updatedAt: '2024-01-03',
    stock: 5,
    type: [],
    logisticsCost: [],
    paymentToken: 'cUSD',
    logisticsProviders: [],
  },
];

// Helper to create mock state
const createMockState = (products: Product[], currentProduct?: Product | null): RootState => ({
  products: {
    products,
    currentProduct: currentProduct || null,
    sponsoredProducts: [],
    searchResults: [],
    searchQuery: '',
    loading: 'idle',
    error: null,
  },
  api: {} as any,
  user: {} as any,
  reviews: {} as any,
  referrals: {} as any,
  orders: {} as any,
  contract: {} as any,
  watchlist: {} as any,
  rewards: {} as any,
  notifications: {} as any,
  chat: {} as any,
});

describe('Product Selectors', () => {
  describe('selectProductsByCategory', () => {
    it('should return all products when category is "All"', () => {
      const state = createMockState(mockProducts);
      const result = selectProductsByCategory(state, 'All');
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockProducts);
    });

    it('should filter products by category (case-insensitive)', () => {
      const state = createMockState(mockProducts);
      const result = selectProductsByCategory(state, 'electronics');
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Electronics');
      expect(result[1].category).toBe('Electronics');
    });

    it('should return empty array for non-existent category', () => {
      const state = createMockState(mockProducts);
      const result = selectProductsByCategory(state, 'NonExistent');
      expect(result).toHaveLength(0);
    });

    it('should return empty array when products is null', () => {
      const state = createMockState([]);
      const result = selectProductsByCategory(state, 'Electronics');
      expect(result).toHaveLength(0);
    });

    it('should memoize results for same inputs', () => {
      const state = createMockState(mockProducts);
      const result1 = selectProductsByCategory(state, 'Electronics');
      const result2 = selectProductsByCategory(state, 'Electronics');
      // Results should be referentially equal (memoized)
      expect(result1).toBe(result2);
    });
  });

  describe('selectRelatedProducts', () => {
    it('should return products in same category excluding current', () => {
      const state = createMockState(mockProducts, mockProducts[0]);
      const result = selectRelatedProducts(state);
      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe('2');
      expect(result[0].category).toBe('Electronics');
    });

    it('should return empty array when no current product', () => {
      const state = createMockState(mockProducts, null);
      const result = selectRelatedProducts(state);
      expect(result).toHaveLength(0);
    });

    it('should return empty array when no products', () => {
      const state = createMockState([], mockProducts[0]);
      const result = selectRelatedProducts(state);
      expect(result).toHaveLength(0);
    });

    it('should normalize seller to string ID', () => {
      const productsWithObjectSeller = [
        {
          ...mockProducts[0],
          seller: { _id: 'seller1', name: 'Seller One' } as any,
        },
      ];
      const state = createMockState(productsWithObjectSeller, productsWithObjectSeller[0]);
      const result = selectRelatedProducts(state);
      // Should normalize seller object to ID
      result.forEach((product) => {
        expect(typeof product.seller).toBe('string');
      });
    });
  });

  describe('selectActiveProducts', () => {
    it('should return only active products', () => {
      const state = createMockState(mockProducts);
      const result = selectActiveProducts(state);
      expect(result).toHaveLength(2);
      result.forEach((product) => {
        expect(product.isActive).toBe(true);
      });
    });

    it('should return empty array when no products', () => {
      const state = createMockState([]);
      const result = selectActiveProducts(state);
      expect(result).toHaveLength(0);
    });
  });

  describe('selectProductsBySeller', () => {
    it('should filter products by seller ID', () => {
      const state = createMockState(mockProducts);
      const result = selectProductsBySeller(state, 'seller1');
      expect(result).toHaveLength(2);
      expect(result[0].seller).toBe('seller1');
      expect(result[1].seller).toBe('seller1');
    });

    it('should handle seller as object', () => {
      const productsWithObjectSeller = [
        {
          ...mockProducts[0],
          seller: { _id: 'seller1', name: 'Seller One' } as any,
        },
      ];
      const state = createMockState(productsWithObjectSeller);
      const result = selectProductsBySeller(state, 'seller1');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for non-existent seller', () => {
      const state = createMockState(mockProducts);
      const result = selectProductsBySeller(state, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });
});
