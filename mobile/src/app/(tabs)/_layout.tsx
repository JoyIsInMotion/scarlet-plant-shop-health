import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text } from 'react-native';
import { BrandLogo, HeaderRight } from '@/components/nav-bar';
import { useAuth } from '@/context/auth';
import { useI18n } from '@/lib/i18n';

const SCARLET = '#C2375A';
const INACTIVE = '#B8A0AC';
const BORDER = '#EDD8E2';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={[styles.icon, focused && styles.iconFocused]}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { m } = useI18n();
  const { isAuthenticated } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: SCARLET,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        headerShadowVisible: false,
        headerStyle: styles.header,
        // The brand logo stands in for the title on every tab, so the auth
        // controls and language toggle are reachable from anywhere.
        headerTitle: () => null,
        headerLeft: () => <BrandLogo />,
        headerRight: () => <HeaderRight />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scarlet',
          tabBarLabel: m.home.home,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: m.home.shop,
          tabBarLabel: m.home.shop,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛍️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          title: m.plants.myPlants,
          tabBarLabel: m.home.myPlants,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🌿" focused={focused} />,
          // My Plants is personal — only show the tab to signed-in users.
          href: isAuthenticated ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: m.home.scan,
          tabBarLabel: m.home.scan,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📷" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopColor: BORDER,
    backgroundColor: '#FFFFFF',
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  icon: {
    fontSize: 20,
    opacity: 0.55,
  },
  iconFocused: {
    opacity: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
  },
});
