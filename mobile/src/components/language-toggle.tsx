import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocale } from '@/context/locale';
import type { Locale } from '@/lib/i18n';

const OPTIONS: Locale[] = ['bg', 'en'];

// Segmented BG | EN switch. Rendered in the header so it's reachable from every
// screen; the choice is persisted by the LocaleProvider.
export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <View style={styles.wrap}>
      {OPTIONS.map((option) => {
        const active = locale === option;
        return (
          <Pressable
            key={option}
            onPress={() => setLocale(option)}
            style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>{option.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: '#F7EEF2',
    borderRadius: 999,
    padding: 3,
    marginRight: 12,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: '#C2375A',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7A6070',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
