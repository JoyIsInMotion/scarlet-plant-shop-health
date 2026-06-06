import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/auth';
import { LocaleProvider } from '@/context/locale';

export default function RootLayout() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <Stack>
          {/* The tab bar lives inside the (tabs) group; it renders its own
              headers, so the root stack hides its header for that screen. */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Pushed full-screen over the tabs, with an automatic back button. */}
          <Stack.Screen name="login" options={{ title: 'Login' }} />
          <Stack.Screen name="plants/[id]" options={{ title: 'Plant' }} />
        </Stack>
      </LocaleProvider>
    </AuthProvider>
  );
}
