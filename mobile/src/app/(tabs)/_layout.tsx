import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text } from 'react-native';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/lib/i18n';

const SCARLET = '#C2375A';
const INACTIVE = '#B8A0AC';
const BORDER = '#EDD8E2';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={[styles.icon, focused && styles.iconFocused]}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { m } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: SCARLET,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        headerStyle: styles.header,
        headerRight: () => <LanguageToggle />,
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
  headerTitle: {
    fontWeight: '800',
    color: '#1A0D12',
  },
});
