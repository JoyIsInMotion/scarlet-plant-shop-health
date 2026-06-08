import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LocaleProvider, useLocale } from '@/context/locale';
import * as storage from '@/lib/storage';
import type { Locale } from '@/lib/i18n';
import type { User } from '@/lib/types';

jest.mock('@/lib/storage');

// Mock useAuth so LocaleProvider can read user.preferredLocale without
// needing a full AuthProvider stack.
jest.mock('@/context/auth', () => ({
  useAuth: jest.fn(() => ({ user: null })),
  AuthProvider: ({ children }: { children: React.ReactNode }) =>
    children as React.ReactElement,
}));

import { useAuth } from '@/context/auth';
const mockUseAuth = useAuth as jest.Mock;

const mockGetItem = storage.getItem as jest.Mock;
const mockSetItem = storage.setItem as jest.Mock;

// ─── Test component ──────────────────────────────────────────────────────────

function LocaleStatus() {
  const { locale, setLocale } = useLocale();
  return (
    <>
      <Text testID="locale">{locale}</Text>
      <Pressable testID="set-en" onPress={() => setLocale('en')} />
      <Pressable testID="set-bg" onPress={() => setLocale('bg')} />
    </>
  );
}

function renderLocale() {
  return render(
    <LocaleProvider>
      <LocaleStatus />
    </LocaleProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockUseAuth.mockReturnValue({ user: null });
});

// ─── Default ─────────────────────────────────────────────────────────────────

describe('default locale', () => {
  it('defaults to Bulgarian when nothing is stored', async () => {
    const { getByTestId } = renderLocale();
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('bg'));
  });

  it('defaults to Bulgarian when the user has no preferredLocale', async () => {
    mockUseAuth.mockReturnValue({ user: { preferredLocale: undefined } });
    const { getByTestId } = renderLocale();
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('bg'));
  });
});

// ─── User preference ─────────────────────────────────────────────────────────

describe('user preferredLocale', () => {
  it('follows user preferredLocale="en" when no override is stored', async () => {
    mockUseAuth.mockReturnValue({ user: { preferredLocale: 'en' } as User });
    const { getByTestId } = renderLocale();
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('en'));
  });

  it('follows user preferredLocale="bg"', async () => {
    mockUseAuth.mockReturnValue({ user: { preferredLocale: 'bg' } as User });
    const { getByTestId } = renderLocale();
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('bg'));
  });
});

// ─── Persisted override ───────────────────────────────────────────────────────

describe('persisted override', () => {
  it('loads a stored locale override ("en") on mount', async () => {
    mockGetItem.mockResolvedValueOnce('en');
    const { getByTestId } = renderLocale();
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('en'));
  });

  it('loads a stored locale override ("bg") on mount', async () => {
    mockGetItem.mockResolvedValueOnce('bg');
    const { getByTestId } = renderLocale();
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('bg'));
  });

  it('ignores an invalid stored value', async () => {
    mockGetItem.mockResolvedValueOnce('fr'); // unsupported locale
    const { getByTestId } = renderLocale();
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('bg'));
  });
});

// ─── setLocale() ─────────────────────────────────────────────────────────────

describe('setLocale()', () => {
  it('updates the locale immediately', async () => {
    const { getByTestId } = renderLocale();
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('bg'));

    fireEvent.press(getByTestId('set-en'));
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('en'));
  });

  it('persists the chosen locale to storage', async () => {
    const { getByTestId } = renderLocale();
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('bg'));

    fireEvent.press(getByTestId('set-en'));
    await waitFor(() => expect(mockSetItem).toHaveBeenCalledWith('app.locale', 'en'));
  });

  it('manual override wins over user preferredLocale', async () => {
    mockUseAuth.mockReturnValue({ user: { preferredLocale: 'en' } as User });
    const { getByTestId } = renderLocale();
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('en'));

    fireEvent.press(getByTestId('set-bg'));
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('bg'));
  });
});

// ─── useLocale outside provider ───────────────────────────────────────────────

describe('useLocale() outside provider', () => {
  it('throws a descriptive error', () => {
    function Bare() { useLocale(); return null; }
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow('LocaleProvider');
    spy.mockRestore();
  });
});
