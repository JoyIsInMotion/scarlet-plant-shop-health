import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Scarlet' }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="shop" options={{ title: 'Shop' }} />
        <Stack.Screen name="plants" options={{ title: 'My Plants' }} />
        <Stack.Screen name="plants/[id]" options={{ title: 'Plant' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan' }} />
      </Stack>
    </AuthProvider>
  );
}
