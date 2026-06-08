import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Import the module under test after the mocks are in place (setup.ts handles
// expo-secure-store; Platform is mocked below per-test).
import { getItem, setItem, deleteItem } from '@/lib/storage';

const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;
const mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Native platform (iOS / Android) ─────────────────────────────────────────

describe('native platform (Platform.OS !== "web")', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  it('getItem delegates to SecureStore.getItemAsync', async () => {
    mockGetItemAsync.mockResolvedValueOnce('{"token":"abc"}');
    const result = await getItem('auth.session');
    expect(mockGetItemAsync).toHaveBeenCalledWith('auth.session');
    expect(result).toBe('{"token":"abc"}');
  });

  it('getItem returns null when the key is not set', async () => {
    mockGetItemAsync.mockResolvedValueOnce(null);
    expect(await getItem('missing.key')).toBeNull();
  });

  it('setItem delegates to SecureStore.setItemAsync', async () => {
    mockSetItemAsync.mockResolvedValueOnce(undefined);
    await setItem('auth.session', 'value');
    expect(mockSetItemAsync).toHaveBeenCalledWith('auth.session', 'value');
  });

  it('deleteItem delegates to SecureStore.deleteItemAsync', async () => {
    mockDeleteItemAsync.mockResolvedValueOnce(undefined);
    await deleteItem('auth.session');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth.session');
  });

  it('does NOT touch localStorage on native', async () => {
    // In the Node/jsdom test environment there is no real localStorage on native platform.
    // We verify indirectly: the result comes from SecureStore, not from any storage shim.
    mockGetItemAsync.mockResolvedValueOnce('native-value');
    const result = await getItem('auth.session');
    expect(mockGetItemAsync).toHaveBeenCalledWith('auth.session');
    expect(result).toBe('native-value');
  });
});

// ─── Web platform ─────────────────────────────────────────────────────────────

describe('web platform (Platform.OS === "web")', () => {
  const localStorageMock = (() => {
    const store: Record<string, string> = {};
    return {
      getItem: jest.fn((key: string) => store[key] ?? null),
      setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: jest.fn((key: string) => { delete store[key]; }),
      clear: jest.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
    };
  })();

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  it('getItem reads from localStorage on web', async () => {
    localStorageMock.getItem.mockReturnValueOnce('stored-value');
    const result = await getItem('app.locale');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('app.locale');
    expect(result).toBe('stored-value');
  });

  it('setItem writes to localStorage on web', async () => {
    await setItem('app.locale', 'en');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('app.locale', 'en');
  });

  it('deleteItem calls localStorage.removeItem on web', async () => {
    await deleteItem('app.locale');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('app.locale');
  });

  it('does NOT call SecureStore on web', async () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    await getItem('auth.session');
    expect(mockGetItemAsync).not.toHaveBeenCalled();
  });
});
