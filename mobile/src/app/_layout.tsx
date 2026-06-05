import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Scarlet' }} />
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="shop" options={{ title: 'Shop' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan' }} />
    </Stack>
  );
}
