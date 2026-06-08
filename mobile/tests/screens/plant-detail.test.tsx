import React from 'react';
import { Alert, Platform } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PlantDetailScreen from '@/app/plants/[id]';
import { ApiError } from '@/lib/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { mockPlant, mockAnalysis, m } from '../utils';

jest.mock('@/context/auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/i18n', () => ({
  useI18n: jest.fn(() => ({ locale: 'en', m: require('../utils').m })),
  pickLocalized: jest.fn((v: unknown) => (typeof v === 'string' ? v : (v as Record<string, string>)?.en ?? null)),
  speciesName: jest.fn((s: { commonNameEn?: string | null } | null) => s?.commonNameEn ?? null),
}));
jest.mock('@/components/auth-guard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children as React.ReactElement,
}));
jest.mock('@/components/health-score-badge', () => ({
  HealthScoreBadge: () => {
    const { Text } = require('react-native');
    return <Text testID="health-badge">85</Text>;
  },
}));
jest.mock('@/components/ai-analysis-card', () => ({
  AIAnalysisCard: () => {
    const { Text } = require('react-native');
    return <Text testID="ai-card">Analysis</Text>;
  },
}));

import { useAuth } from '@/context/auth';
const mockUseAuth = useAuth as jest.Mock;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
(useRouter as jest.Mock).mockReturnValue(mockRouter);
(useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'plant-1' });

function makeAuthedRequest(plant = mockPlant, analyses = [mockAnalysis]) {
  return jest.fn().mockImplementation((fn: (token: string) => unknown) => {
    // The screen fires two parallel authedRequests: getPlant and getPlantAnalyses.
    // Return different data based on position of calls.
    return fn('tok');
  });
}

// More precise version that tracks call order
function makeOrderedAuthedRequest(plant = mockPlant, analyses = [mockAnalysis]) {
  let callCount = 0;
  return jest.fn().mockImplementation((_fn: (token: string) => unknown) => {
    callCount++;
    if (callCount % 2 === 1) {
      // Odd calls = getPlant
      return Promise.resolve(plant);
    } else {
      // Even calls = getPlantAnalyses
      return Promise.resolve({ analyses, total: analyses.length });
    }
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'plant-1' });
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
});

// ─── Loading ──────────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('renders without crashing while loading', async () => {
    const authedRequest = jest.fn(() => new Promise(() => {}));
    mockUseAuth.mockReturnValue({ authedRequest });
    const { unmount } = render(<PlantDetailScreen />);
    unmount();
  });
});

// ─── Plant data display ───────────────────────────────────────────────────────

describe('plant data display', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ authedRequest: makeOrderedAuthedRequest() });
  });

  it('shows the plant custom name after loading', async () => {
    const { getByText } = render(<PlantDetailScreen />);
    await waitFor(() => expect(getByText(mockPlant.customName)).toBeTruthy());
  });

  it('shows the AI analysis card when there is a latest analysis', async () => {
    const { getByTestId } = render(<PlantDetailScreen />);
    await waitFor(() => expect(getByTestId('ai-card')).toBeTruthy());
  });

  it('shows "no analysis" text when there are no analyses', async () => {
    let call = 0;
    const authedRequest = jest.fn().mockImplementation(() => {
      call++;
      if (call % 2 === 1) return Promise.resolve(mockPlant);
      return Promise.resolve({ analyses: [], total: 0 });
    });
    mockUseAuth.mockReturnValue({ authedRequest });
    const { getByText } = render(<PlantDetailScreen />);
    await waitFor(() => expect(getByText(m.plants.noAnalysis)).toBeTruthy());
  });
});

// ─── Run analysis ─────────────────────────────────────────────────────────────

describe('run analysis', () => {
  it('calls runPlantAnalysis and refreshes the plant on press', async () => {
    let call = 0;
    const authedRequest = jest.fn().mockImplementation(() => {
      call++;
      // Initial load: 1=getPlant, 2=getPlantAnalyses
      if (call === 1) return Promise.resolve(mockPlant);
      if (call === 2) return Promise.resolve({ analyses: [], total: 0 });
      // Run analysis: 3=runPlantAnalysis, 4=getPlant refresh
      if (call === 3)
        return Promise.resolve({
          analysis: mockAnalysis,
          matchedSpecies: null,
          advice: null,
          careBasics: null,
        });
      return Promise.resolve(mockPlant);
    });
    mockUseAuth.mockReturnValue({ authedRequest });
    const { getByText } = render(<PlantDetailScreen />);
    await waitFor(() => expect(getByText(mockPlant.customName)).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.runAnalysis, 'i')));
    await waitFor(() => expect(authedRequest).toHaveBeenCalledTimes(4));
  });
});

// ─── Edit navigation ──────────────────────────────────────────────────────────
// The edit button lives in the Stack.Screen headerRight option (not in the
// scroll-view body) and is therefore not rendered by the test renderer.
// We verify the option is wired up correctly via the Stack.Screen mock.

describe('edit button', () => {
  it('configures the edit header button and wires router.push', async () => {
    const { Stack } = require('expo-router') as { Stack: { Screen: jest.Mock } };
    mockUseAuth.mockReturnValue({ authedRequest: makeOrderedAuthedRequest() });
    render(<PlantDetailScreen />);
    await waitFor(() => expect(Stack.Screen).toHaveBeenCalled());
    const opts = Stack.Screen.mock.calls.at(-1)?.[0]?.options;
    expect(typeof opts?.headerRight).toBe('function');
    // The headerRight returns a Pressable whose onPress closes over the router.
    const headerEl = opts.headerRight() as React.ReactElement;
    act(() => { headerEl.props.onPress(); });
    expect(mockRouter.push).toHaveBeenCalledWith('/plants/plant-1/edit');
  });
});

// ─── Delete plant ─────────────────────────────────────────────────────────────

describe('delete plant', () => {
  it('navigates to /plants after confirmed deletion (web path)', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    // Mock window.confirm to return true (user confirms)
    global.window = { confirm: jest.fn(() => true) } as unknown as Window & typeof globalThis;

    let call = 0;
    const authedRequest = jest.fn().mockImplementation(() => {
      call++;
      if (call === 1) return Promise.resolve(mockPlant);
      if (call === 2) return Promise.resolve({ analyses: [], total: 0 });
      return Promise.resolve({ message: 'Deleted' });
    });
    mockUseAuth.mockReturnValue({ authedRequest });
    const { getByText } = render(<PlantDetailScreen />);
    await waitFor(() => expect(getByText(new RegExp(m.plants.deletePlant, 'i'))).toBeTruthy());
    await act(async () => { fireEvent.press(getByText(new RegExp(m.plants.deletePlant, 'i'))); });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/plants'));
  });

  it('does not delete when the user cancels (web path)', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    global.window = { confirm: jest.fn(() => false) } as unknown as Window & typeof globalThis;

    const authedRequest = jest.fn()
      .mockResolvedValueOnce(mockPlant)
      .mockResolvedValueOnce({ analyses: [], total: 0 });
    mockUseAuth.mockReturnValue({ authedRequest });
    const { getByText } = render(<PlantDetailScreen />);
    await waitFor(() => expect(getByText(new RegExp(m.plants.deletePlant, 'i'))).toBeTruthy());
    await act(async () => { fireEvent.press(getByText(new RegExp(m.plants.deletePlant, 'i'))); });
    // Should not have called deletePlant (3rd authedRequest)
    expect(authedRequest).toHaveBeenCalledTimes(2);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows an error notification when deletion fails', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    global.window = {
      confirm: jest.fn(() => true),
      alert: jest.fn(),
    } as unknown as Window & typeof globalThis;

    let call = 0;
    const authedRequest = jest.fn().mockImplementation(() => {
      call++;
      if (call === 1) return Promise.resolve(mockPlant);
      if (call === 2) return Promise.resolve({ analyses: [], total: 0 });
      return Promise.reject(new ApiError('Delete failed', 500));
    });
    mockUseAuth.mockReturnValue({ authedRequest });
    const { getByText } = render(<PlantDetailScreen />);
    await waitFor(() => expect(getByText(new RegExp(m.plants.deletePlant, 'i'))).toBeTruthy());
    await act(async () => { fireEvent.press(getByText(new RegExp(m.plants.deletePlant, 'i'))); });
    await waitFor(() => expect((global.window as { alert: jest.Mock }).alert).toHaveBeenCalled());
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe('error state', () => {
  it('shows an error and retry button when loading fails', async () => {
    const authedRequest = jest.fn().mockRejectedValue(new ApiError('Not found', 404));
    mockUseAuth.mockReturnValue({ authedRequest });
    const { getByText } = render(<PlantDetailScreen />);
    await waitFor(() => expect(getByText('Not found')).toBeTruthy());
    expect(getByText(m.common.retry)).toBeTruthy();
  });
});
