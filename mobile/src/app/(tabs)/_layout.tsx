import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo, HeaderRight } from '@/components/nav-bar';
import { useAuth } from '@/context/auth';
import { useI18n } from '@/lib/i18n';

const SCARLET = '#C2375A';
const INACTIVE = '#B8A0AC';
const BORDER = '#EDD8E2';

// Room for the icon + label, before the device's bottom system area is added.
const BAR_CONTENT_HEIGHT = 58;

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]} numberOfLines={1}>
      {emoji}
    </Text>
  );
}

export default function TabsLayout() {
  const { m } = useI18n();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  // Sit the bar above the phone's bottom system area — the gesture pill or the
  // 3-button navigation bar — so labels are never hidden behind it. Keep a
  // floor so devices that report no inset still leave breathing room under the
  // labels (where the "p" in "Shop" used to clip).
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: SCARLET,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: styles.label,
        // Keep the label under the icon on every device. Without this, large
        // screens (tablets / landscape) default to a beside-icon layout that
        // crops the labels in the narrow per-tab column.
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: [
          styles.bar,
          { height: BAR_CONTENT_HEIGHT + bottomPad, paddingBottom: bottomPad },
        ],
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
          tabBarLabel: m.home.tabPlants,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🌿" focused={focused} />,
          // My Plants is personal — only show the tab to signed-in users.
          href: isAuthenticated ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: m.home.scan,
          tabBarLabel: m.home.tabScan,
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
    paddingTop: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    // React Navigation pins each tab item to a fixed height; if the icon +
    // label exceed it, flexbox shrinks the label and its overflow:hidden box
    // clips the text. Keep the label at its natural height so it can't shrink.
    flexShrink: 0,
  },
  icon: {
    // Keep the emoji compact so the icon + label fit the fixed item height
    // without the label being squeezed (which clipped it on web).
    fontSize: 18,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.55,
  },
  iconFocused: {
    opacity: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
  },
});
