// Global test setup — runs after Jest installs its environment.
// Provides universal mocks for Expo native modules that cannot execute in Node.

// ─── expo-router ─────────────────────────────────────────────────────────────
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  Redirect: jest.fn(() => null),
  Link: jest.fn(({ children }: { children: React.ReactNode }) => children as React.ReactElement),
  Stack: { Screen: jest.fn(() => null) },
  router: { push: jest.fn(), replace: jest.fn() },
}));

// ─── expo-secure-store ───────────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── expo-image ──────────────────────────────────────────────────────────────
jest.mock('expo-image', () => ({ Image: 'Image' }));

// ─── expo-image-picker ───────────────────────────────────────────────────────
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: true, status: 'granted' }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
}));

// ─── expo-image-manipulator ──────────────────────────────────────────────────
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest
    .fn()
    .mockResolvedValue({ uri: 'file://processed.jpg', width: 1280, height: 960 }),
  SaveFormat: { JPEG: 'jpeg' },
}));

// ─── react-native-safe-area-context ──────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
    children as React.ReactElement,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children as React.ReactElement,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ─── react-native-reanimated ─────────────────────────────────────────────────
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
