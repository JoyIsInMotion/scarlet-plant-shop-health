import React from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { AuthProvider } from '@/context/auth';
import { CartProvider } from '@/context/cart';
import { LocaleProvider } from '@/context/locale';
import type { AIAnalysis, Plant, User } from '@/lib/types';

// ─── Shared message mock ──────────────────────────────────────────────────────
// Minimal English strings covering every screen under test.
export const m = {
  common: { back: 'Back', retry: 'Try again', loading: 'Loading...', error: 'Error', save: 'Save', saving: 'Saving...', cancel: 'Cancel' },
  nav: { login: 'Login', logout: 'Logout', account: 'Account' },
  account: { title: 'Account', subtitle: 'Manage your details.', name: 'Name', email: 'Email', phone: 'Phone', phonePlaceholder: '+359 ...', phoneHint: '', saved: 'Changes saved', saveError: 'Changes not saved.', logout: 'Logout', guestTitle: 'Not signed in', guestDesc: 'Sign in to manage your details.' },
  landing: { tag: 'Scarlet', heroTitle: 'Welcome to Scarlet', heroSubtitle: 'Your flower shop', heroButton: 'Browse shop', getStarted: 'Get started', whyUs: 'Why Scarlet?', feature1Title: 'AI analysis', feature1Desc: 'Scan plants', feature2Title: 'Plant catalog', feature2Desc: '500+ species', feature3Title: 'Boutique shop', feature3Desc: 'Curated flowers', plantHealthEyebrow: 'Plant health', plantHealthCTA: 'Track health', plantHealthDesc: 'Add plants and use AI', plantHealthButton: 'Try 1 free scan' },
  home: { greeting: 'Hello', welcomeSub: 'Browse or scan.', shop: 'Shop', shopDesc: 'Bouquets and more', myPlants: 'My Plants', plantsDesc: 'Your collection', scan: 'Scan', scanDesc: 'AI health analysis', quickActions: 'Quick actions', browseCategories: 'Browse by category', home: 'Home', tabPlants: 'Plants', tabScan: 'Scan', cart: 'Cart', searchPlaceholder: 'Search...', collections: 'Collections', bestSelling: 'Best selling', items: 'products', viewAll: 'View all', promoTitle: 'Find your plant', promoSub: 'Curated plants', login: 'Sign in to start', logout: 'Logout', allCategories: 'All', categories: { bouquet: 'Bouquets', potted_plant: 'Potted', succulent: 'Succulents', tropical: 'Tropical', seasonal: 'Seasonal', accessories: 'Accessories' } },
  shop: { title: 'Shop', searchPlaceholder: 'Search...', all: 'All', filters: 'Filters', sortNewest: 'Newest', sortPriceAsc: 'Price ↑', sortPriceDesc: 'Price ↓', addToCart: 'Add to cart', inStock: 'In stock', outOfStock: 'Out of stock', noResults: 'No products' },
  cart: { title: 'Cart', empty: 'Cart is empty', total: 'Total', checkout: 'Checkout', remove: 'Remove', qty: 'Qty', phone: 'Phone', phonePlaceholder: '+359 ...', placeOrder: 'Place Order', orderSuccess: 'Order placed!', orderError: 'Failed to place order' },
  orders: { title: 'Orders', noOrders: 'No orders yet', orderDate: 'Order date', status: 'Status', total: 'Total', items: 'items', view: 'View' },
  plants: { myPlants: 'My Plants', addPlant: 'Add Plant', manageCollection: 'Manage your plants', plantsCount: 'plants', noPlants: 'No plants yet', loadError: 'Failed to load plants', deletePlant: 'Delete Plant', deleteConfirm: 'Delete this plant?', deleteFailed: 'Failed to delete', editPlant: 'Edit', linked: 'Linked to species', speciesConfirmed: 'Confirmed', latestAnalysis: 'Latest Analysis', noAnalysis: 'No analysis yet', notFound: 'Plant not found', saveToCollection: 'Save to collection', lastWatered: 'Last watered' },
  ai: { quickScan: 'Quick Scan', quickScanNote: 'Scan for health analysis', runAnalysis: 'Run AI Analysis', analysisFailed: 'Analysis failed', freeScanHint: '1 free scan today', takePhoto: 'Take Photo', choosePhoto: 'Choose Photo', removePhoto: 'Remove photo', scanButton: 'Scan Plant', scanAnother: 'Scan another', limitReachedTitle: 'Daily limit reached', limitReachedDesc: 'Sign in for more scans', permissionDenied: 'Permission denied' },
  catalog: { title: 'Catalog', scientificName: 'Scientific name', family: 'Family', nativeRegion: 'Native region', careDifficulty: 'Care difficulty', easy: 'Easy', moderate: 'Moderate', difficult: 'Difficult' },
  health: { score: 'Health score', excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor', critical: 'Critical' },
};

// ─── Provider wrapper ─────────────────────────────────────────────────────────
export function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocaleProvider>
        <CartProvider>{children}</CartProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// ─── Data fixtures ────────────────────────────────────────────────────────────
export const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  phone: null,
  role: 'user',
  avatarUrl: null,
  isActive: true,
  preferredLocale: 'en',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockPlant: Plant = {
  id: 'plant-1',
  userId: 'user-1',
  speciesId: 'species-1',
  species: {
    id: 'species-1',
    commonNameEn: 'Snake Plant',
    commonNameBg: 'Змийско растение',
    scientificName: 'Sansevieria trifasciata',
    family: 'Asparagaceae',
    nativeRegionEn: 'West Africa',
    nativeRegionBg: 'Западна Африка',
    careDifficulty: 'easy',
    imageUrl: null,
  },
  customName: 'My Snake Plant',
  healthScore: 85,
  lastWatered: '2024-06-01T00:00:00Z',
  imageUrl: null,
  isArchived: false,
  speciesConfirmed: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockAnalysis: AIAnalysis = {
  id: 'analysis-1',
  plantId: 'plant-1',
  userId: 'user-1',
  imageUrl: 'https://example.com/scan.jpg',
  healthScore: 85,
  overallCondition: 'good',
  issues: [],
  careRecommendations: [{ en: 'Water weekly', bg: 'Поливай седмично' }],
  wateringNeeded: false,
  identifiedCommonName: 'Snake Plant',
  identifiedScientificName: 'Sansevieria trifasciata',
  identifiedFamily: 'Asparagaceae',
  identifiedNativeRegion: 'West Africa',
  identifiedCareDifficulty: 'easy',
  confidence: 'high',
  matchedSpeciesId: 'species-1',
  modelUsed: 'claude-3-5',
  analyzedAt: '2024-06-01T00:00:00Z',
};

// Builds a typed mock auth context value; override only what the test cares about.
export function mockAuthValue(overrides: Record<string, unknown> = {}) {
  return {
    user: null as User | null,
    accessToken: null as string | null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
    authedRequest: jest.fn(),
    ...overrides,
  };
}
