import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/auth';
import { CartProvider } from '@/context/cart';
import { LocaleProvider } from '@/context/locale';
import { useI18n } from '@/lib/i18n';

function RootStack() {
  const { m } = useI18n();
  return (
    <Stack>
      {/* The tab bar lives inside the (tabs) group; it renders its own
          headers, so the root stack hides its header for that screen. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Pushed full-screen over the tabs, with an automatic back button. */}
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="register" options={{ title: 'Sign up' }} />
      <Stack.Screen name="account" options={{ title: m.account.title }} />
      <Stack.Screen name="plants/[id]" options={{ title: 'Plant' }} />
      <Stack.Screen name="plants/new" options={{ title: '' }} />
      <Stack.Screen name="plants/[id]/edit" options={{ title: '' }} />
      <Stack.Screen name="shop/[id]" options={{ title: m.shop.title }} />
      <Stack.Screen name="cart" options={{ title: m.cart.title }} />
      <Stack.Screen name="orders" options={{ title: m.orders.myOrders }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocaleProvider>
          <CartProvider>
            <RootStack />
          </CartProvider>
        </LocaleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
