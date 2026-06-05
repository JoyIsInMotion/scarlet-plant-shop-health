import { StyleSheet, Text, View } from 'react-native';
import { Locale, getMessages } from '@/lib/i18n';

// Mirrors the web HealthScoreRing color thresholds. React Native has no SVG by
// default, so we render a colored ring using a circular border instead.
export function healthColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

export function healthLabel(score: number, locale: Locale): string {
  const h = getMessages(locale).health;
  if (score >= 80) return h.excellent;
  if (score >= 60) return h.good;
  if (score >= 40) return h.fair;
  if (score >= 20) return h.poor;
  return h.critical;
}

interface Props {
  score: number;
  size?: number;
  locale: Locale;
  showLabel?: boolean;
}

export function HealthScoreBadge({ score, size = 52, locale, showLabel }: Props) {
  const color = healthColor(score);
  const rounded = Math.round(score);
  const large = size >= 64;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            backgroundColor: `${color}14`,
          },
        ]}>
        <Text style={[styles.score, { color, fontSize: large ? 20 : 15 }]}>{rounded}</Text>
      </View>
      {showLabel && <Text style={[styles.label, { color }]}>{healthLabel(score, locale)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
  },
  ring: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontWeight: '800',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
