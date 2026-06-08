import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HealthScoreBadge } from '@/components/health-score-badge';
import { Locale, speciesName, useI18n } from '@/lib/i18n';
import { Plant } from '@/lib/types';

function formatDate(value: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(
      new Date(value)
    );
  } catch {
    return '';
  }
}

export function PlantCard({ plant }: { plant: Plant }) {
  const { locale } = useI18n();
  const name = speciesName(plant.species, locale);

  return (
    <Link href={{ pathname: '/plants/[id]', params: { id: plant.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.imageWrap}>
          {plant.imageUrl ? (
            <Image
              source={{ uri: plant.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              recyclingKey={plant.id}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.placeholderText}>🌿</Text>
            </View>
          )}
          {/* Health ring overlaid so the card stays narrow in the 2-up grid. */}
          <View style={styles.badgeOverlay}>
            <HealthScoreBadge score={plant.healthScore} locale={locale} size={40} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {plant.customName}
          </Text>
          {name && (
            <Text style={styles.species} numberOfLines={1}>
              {name}
            </Text>
          )}
          {plant.lastWatered && (
            <Text style={styles.meta} numberOfLines={1}>
              💧 {formatDate(plant.lastWatered, locale)}
            </Text>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ECEEF1',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  imageWrap: {
    aspectRatio: 1,
    backgroundColor: '#F1F5F2',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 36,
  },
  badgeOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    padding: 2,
  },
  body: {
    padding: 10,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C',
  },
  species: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#8B9097',
  },
  meta: {
    fontSize: 11,
    color: '#60646C',
    marginTop: 2,
  },
});
