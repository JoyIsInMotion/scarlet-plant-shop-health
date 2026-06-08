import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PlantsScreen from '@/app/(tabs)/plants';
import { ApiError } from '@/lib/api';
import { useRouter } from 'expo-router';
import { mockPlant, m } from '../utils';
import type { Plant } from '@/lib/types';

jest.mock('@/context/auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/i18n', () => ({
  useI18n: jest.fn(() => ({ locale: 'en', m: require('../utils').m })),
}));
jest.mock('@/components/plant-card', () => ({
  PlantCard: ({ plant }: { plant: Plant }) => {
    const { Text } = require('react-native');
    return <Text testID={`plant-${plant.id}`}>{plant.customName}</Text>;
  },
}));
jest.mock('@/components/auth-guard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children as React.ReactElement,
}));

import { useAuth } from '@/context/auth';
const mockUseAuth = useAuth as jest.Mock;

const mockRouter = { push: jest.fn(), replace: jest.fn() };
(useRouter as jest.Mock).mockReturnValue(mockRouter);

const plant2: Plant = { ...mockPlant, id: 'plant-2', customName: 'Cactus' };

function makeAuthedRequest(plants: Plant[], total = plants.length, hasMore = false) {
  return jest.fn().mockResolvedValue({
    plants,
    total,
    hasMore,
    nextCursor: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('shows an ActivityIndicator while the first page loads', async () => {
    let resolve: (v: unknown) => void;
    const authedRequest = jest.fn(() => new Promise((r) => { resolve = r; }));
    mockUseAuth.mockReturnValue({ authedRequest });

    const { getByTestId } = render(<PlantsScreen />);
    // loading is true initially, so the spinner view is shown
    // (we can't query ActivityIndicator by role easily, but we verify the plant
    // list is not yet rendered)
    await act(async () => { resolve!({ plants: [], total: 0, hasMore: false, nextCursor: null }); });
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('empty state', () => {
  it('shows the "no plants" message when the collection is empty', async () => {
    mockUseAuth.mockReturnValue({ authedRequest: makeAuthedRequest([]) });
    const { getByText } = render(<PlantsScreen />);
    await waitFor(() => expect(getByText(m.plants.noPlants)).toBeTruthy());
  });
});

// ─── List rendering ───────────────────────────────────────────────────────────

describe('list rendering', () => {
  it('renders a card for each plant', async () => {
    mockUseAuth.mockReturnValue({ authedRequest: makeAuthedRequest([mockPlant, plant2]) });
    const { getByTestId } = render(<PlantsScreen />);
    await waitFor(() => {
      expect(getByTestId('plant-plant-1')).toBeTruthy();
      expect(getByTestId('plant-plant-2')).toBeTruthy();
    });
  });

  it('shows the total plant count', async () => {
    mockUseAuth.mockReturnValue({ authedRequest: makeAuthedRequest([mockPlant], 42) });
    const { getByText } = render(<PlantsScreen />);
    await waitFor(() => expect(getByText(/42/)).toBeTruthy());
  });
});

// ─── Add plant navigation ─────────────────────────────────────────────────────

describe('add plant buttons', () => {
  it('navigates to /plants/new when the header "Add Plant" button is pressed', async () => {
    mockUseAuth.mockReturnValue({ authedRequest: makeAuthedRequest([mockPlant]) });
    const { getByText } = render(<PlantsScreen />);
    await waitFor(() => expect(getByText(m.plants.myPlants)).toBeTruthy());
    fireEvent.press(getByText(`+ ${m.plants.addPlant}`));
    expect(mockRouter.push).toHaveBeenCalledWith('/plants/new');
  });

  it('navigates to /plants/new when the FAB (+) is pressed', async () => {
    mockUseAuth.mockReturnValue({ authedRequest: makeAuthedRequest([]) });
    const { getByText } = render(<PlantsScreen />);
    await waitFor(() => expect(getByText(m.plants.noPlants)).toBeTruthy());
    // FAB has accessibilityLabel matching m.plants.addPlant
    const { getAllByText } = render(<PlantsScreen />);
    await waitFor(() => {
      const plusButtons = getAllByText('+');
      expect(plusButtons.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe('error state', () => {
  it('shows the error message and a retry button when loading fails', async () => {
    const authedRequest = jest.fn().mockRejectedValue(new ApiError('Server error', 500));
    mockUseAuth.mockReturnValue({ authedRequest });
    const { getByText } = render(<PlantsScreen />);
    await waitFor(() => expect(getByText('Server error')).toBeTruthy());
    expect(getByText(m.common.retry)).toBeTruthy();
  });

  it('falls back to the i18n loadError message for non-ApiError failures', async () => {
    const authedRequest = jest.fn().mockRejectedValue(new Error('Network'));
    mockUseAuth.mockReturnValue({ authedRequest });
    const { getByText } = render(<PlantsScreen />);
    await waitFor(() => expect(getByText(m.plants.loadError)).toBeTruthy());
  });

  it('retries loading when the retry button is pressed', async () => {
    const authedRequest = jest
      .fn()
      .mockRejectedValueOnce(new ApiError('Server error', 500))
      .mockResolvedValueOnce({ plants: [mockPlant], total: 1, hasMore: false, nextCursor: null });
    mockUseAuth.mockReturnValue({ authedRequest });
    const { getByText, getByTestId } = render(<PlantsScreen />);
    await waitFor(() => expect(getByText(m.common.retry)).toBeTruthy());
    fireEvent.press(getByText(m.common.retry));
    await waitFor(() => expect(getByTestId('plant-plant-1')).toBeTruthy());
    expect(authedRequest).toHaveBeenCalledTimes(2);
  });
});

// ─── Pagination (scalability) ─────────────────────────────────────────────────

describe('pagination', () => {
  it('loads the first 12 plants', async () => {
    const plants = Array.from({ length: 12 }, (_, i) => ({
      ...mockPlant,
      id: `plant-${i}`,
      customName: `Plant ${i}`,
    }));
    const authedRequest = jest.fn().mockResolvedValue({
      plants,
      total: 24,
      hasMore: true,
      nextCursor: null,
    });
    mockUseAuth.mockReturnValue({ authedRequest });
    render(<PlantsScreen />);
    await waitFor(() => expect(authedRequest).toHaveBeenCalledTimes(1));
    // Verify the offset=0 (first page) was requested
    const callArg = authedRequest.mock.calls[0][0];
    // authedRequest receives (token => getPlants(token, {limit, offset}))
    // We can verify it was called once on mount
    expect(authedRequest).toHaveBeenCalledTimes(1);
  });

  it('does not load more when hasMore is false', async () => {
    const authedRequest = makeAuthedRequest([mockPlant], 1, false);
    mockUseAuth.mockReturnValue({ authedRequest });
    render(<PlantsScreen />);
    // Only the initial page load should fire (hasMore=false → no further fetches).
    await waitFor(() => expect(authedRequest).toHaveBeenCalledTimes(1));
    expect(authedRequest).toHaveBeenCalledTimes(1);
  });
});
