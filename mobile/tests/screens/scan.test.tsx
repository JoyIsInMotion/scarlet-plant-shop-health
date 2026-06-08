import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ScanScreen from '@/app/(tabs)/scan';
import { ApiError } from '@/lib/api';
import { useRouter } from 'expo-router';
import * as storage from '@/lib/storage';
import * as imageScan from '@/lib/image-scan';
import * as api from '@/lib/api';
import { mockAnalysis, m } from '../utils';

jest.mock('@/context/auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/i18n', () => ({
  useI18n: jest.fn(() => ({ locale: 'en', m: require('../utils').m })),
  pickLocalized: jest.fn((v: unknown) => (typeof v === 'string' ? v : (v as Record<string, string>)?.en ?? null)),
}));
jest.mock('@/lib/storage');
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  quickScan: jest.fn(),
}));
jest.mock('@/lib/image-scan');
jest.mock('@/components/ai-analysis-card', () => ({
  AIAnalysisCard: () => {
    const { Text } = require('react-native');
    return <Text testID="ai-analysis-card">Analysis Result</Text>;
  },
}));

import { useAuth } from '@/context/auth';
const mockUseAuth = useAuth as jest.Mock;

const mockRouter = { push: jest.fn(), replace: jest.fn() };
(useRouter as jest.Mock).mockReturnValue(mockRouter);

const mockGetItem = storage.getItem as jest.Mock;
const mockSetItem = storage.setItem as jest.Mock;
const mockPickScanImage = imageScan.pickScanImage as jest.Mock;
const mockQuickScan = api.quickScan as jest.Mock;

const fakeImage = { uri: 'file://plant.jpg', name: 'plant.jpg', mimeType: 'image/jpeg' };
const scanResult = {
  analysis: { ...mockAnalysis, identifiedCommonName: 'Fern' },
  matchedSpecies: null,
  advice: { en: 'Water regularly.', bg: 'Поливай редовно.' },
  careBasics: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockPickScanImage.mockResolvedValue(fakeImage);
  mockQuickScan.mockResolvedValue(scanResult);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('rendering (unauthenticated, no limit)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ authedRequest: jest.fn(), isAuthenticated: false });
  });

  it('shows the Quick Scan title', async () => {
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.quickScan)).toBeTruthy());
  });

  it('shows camera and library picker buttons', async () => {
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => {
      expect(getByText(m.ai.takePhoto)).toBeTruthy();
      expect(getByText(m.ai.choosePhoto)).toBeTruthy();
    });
  });

  it('shows the free scan hint for unauthenticated visitors', async () => {
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(new RegExp(m.ai.freeScanHint, 'i'))).toBeTruthy());
  });
});

// ─── Photo picking ────────────────────────────────────────────────────────────

describe('photo picking', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ authedRequest: jest.fn(), isAuthenticated: false });
  });

  it('shows the Scan button after picking an image from the library', async () => {
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.choosePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.choosePhoto));
    await waitFor(() =>
      expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy()
    );
  });

  it('shows the Scan button after taking a photo with the camera', async () => {
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.takePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.takePhoto));
    await waitFor(() =>
      expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy()
    );
  });

  it('shows a permission error when the picker throws PermissionDeniedError', async () => {
    mockPickScanImage.mockRejectedValueOnce(new imageScan.PermissionDeniedError());
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.choosePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.choosePhoto));
    await waitFor(() => expect(getByText(m.ai.permissionDenied)).toBeTruthy());
  });

  it('does nothing when the picker returns null (user cancelled)', async () => {
    mockPickScanImage.mockResolvedValueOnce(null);
    const { getByText, queryByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.choosePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.choosePhoto));
    await waitFor(() => {});
    expect(queryByText(new RegExp(m.ai.scanButton, 'i'))).toBeNull();
  });
});

// ─── Scan action (authenticated) ─────────────────────────────────────────────

describe('scan action — authenticated user', () => {
  beforeEach(() => {
    const authedRequest = jest.fn().mockImplementation((fn: (token: string) => unknown) =>
      fn('access-token')
    );
    mockUseAuth.mockReturnValue({ authedRequest, isAuthenticated: true });
  });

  it('calls quickScan with the token via authedRequest', async () => {
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.takePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.takePhoto));
    await waitFor(() => expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.scanButton, 'i')));
    await waitFor(() => expect(getByText('Analysis Result')).toBeTruthy());
    expect(mockQuickScan).toHaveBeenCalledWith(fakeImage, 'access-token');
  });

  it('shows the AIAnalysisCard with the result', async () => {
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.takePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.takePhoto));
    await waitFor(() => expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.scanButton, 'i')));
    await waitFor(() => expect(getByText('Analysis Result')).toBeTruthy());
  });

  it('shows "Save to collection" button after a successful scan', async () => {
    const { getByText } = render(<ScanScreen />);
    fireEvent.press(getByText(m.ai.takePhoto));
    await waitFor(() => expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.scanButton, 'i')));
    await waitFor(() => expect(getByText(new RegExp(m.plants.saveToCollection, 'i'))).toBeTruthy());
  });

  it('navigates to /plants/new when "Save to collection" is pressed', async () => {
    const { getByText } = render(<ScanScreen />);
    fireEvent.press(getByText(m.ai.takePhoto));
    await waitFor(() => expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.scanButton, 'i')));
    await waitFor(() => expect(getByText(new RegExp(m.plants.saveToCollection, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.plants.saveToCollection, 'i')));
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/plants/new' })
    );
  });
});

// ─── Scan action (anonymous) ──────────────────────────────────────────────────

describe('scan action — anonymous visitor', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ authedRequest: jest.fn(), isAuthenticated: false });
  });

  it('calls quickScan without a token', async () => {
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.choosePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.choosePhoto));
    await waitFor(() => expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.scanButton, 'i')));
    await waitFor(() => expect(mockQuickScan).toHaveBeenCalled());
    // Anonymous scan: called with only the image (no token argument).
    expect(mockQuickScan).toHaveBeenCalledWith(fakeImage);
  });

  it('records the scan timestamp in storage after a successful anonymous scan', async () => {
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.choosePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.choosePhoto));
    await waitFor(() => expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.scanButton, 'i')));
    await waitFor(() =>
      expect(mockSetItem).toHaveBeenCalledWith('scan.anonUsedAt', expect.any(String))
    );
  });
});

// ─── Anonymous scan limit ─────────────────────────────────────────────────────

describe('anonymous scan limit', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ authedRequest: jest.fn(), isAuthenticated: false });
  });

  it('blocks scanning when the daily limit has been used today', async () => {
    // Simulate a scan used less than 24 h ago
    mockGetItem.mockResolvedValueOnce(String(Date.now() - 1000 * 60 * 60));
    const { getByText, queryByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.limitReachedTitle)).toBeTruthy());
    expect(queryByText(m.ai.takePhoto)).toBeNull();
  });

  it('allows scanning when the previous scan was over 24 h ago', async () => {
    // 25 hours ago
    mockGetItem.mockResolvedValueOnce(String(Date.now() - 1000 * 60 * 60 * 25));
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.takePhoto)).toBeTruthy());
  });

  it('shows the limit reached card when the server returns ANON_LIMIT', async () => {
    mockQuickScan.mockRejectedValueOnce(new ApiError('Limit reached', 401, 'ANON_LIMIT'));
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.choosePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.choosePhoto));
    await waitFor(() => expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.scanButton, 'i')));
    await waitFor(() => expect(getByText(m.ai.limitReachedTitle)).toBeTruthy());
  });

  it('navigates to /login from the limit-reached prompt', async () => {
    mockGetItem.mockResolvedValueOnce(String(Date.now() - 1000));
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.nav.login)).toBeTruthy());
    fireEvent.press(getByText(m.nav.login));
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('records the scan timestamp in storage when ANON_LIMIT is returned by the server', async () => {
    mockQuickScan.mockRejectedValueOnce(new ApiError('Limit reached', 401, 'ANON_LIMIT'));
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.choosePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.choosePhoto));
    await waitFor(() => expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.scanButton, 'i')));
    await waitFor(() =>
      expect(mockSetItem).toHaveBeenCalledWith('scan.anonUsedAt', expect.any(String))
    );
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('scan error handling', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ authedRequest: jest.fn(), isAuthenticated: false });
  });

  it('shows the API error message on a scan failure', async () => {
    mockQuickScan.mockRejectedValueOnce(new ApiError('Analysis failed on server', 500));
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.choosePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.choosePhoto));
    await waitFor(() => expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.scanButton, 'i')));
    await waitFor(() => expect(getByText('Analysis failed on server')).toBeTruthy());
  });

  it('shows the fallback message on a non-ApiError failure', async () => {
    mockQuickScan.mockRejectedValueOnce(new Error('Network'));
    const { getByText } = render(<ScanScreen />);
    await waitFor(() => expect(getByText(m.ai.choosePhoto)).toBeTruthy());
    fireEvent.press(getByText(m.ai.choosePhoto));
    await waitFor(() => expect(getByText(new RegExp(m.ai.scanButton, 'i'))).toBeTruthy());
    fireEvent.press(getByText(new RegExp(m.ai.scanButton, 'i')));
    await waitFor(() => expect(getByText(m.ai.analysisFailed)).toBeTruthy());
  });
});
