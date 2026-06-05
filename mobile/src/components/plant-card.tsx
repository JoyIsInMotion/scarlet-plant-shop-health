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
  const { locale, m } = useI18n();
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
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.placeholderText}>🌿</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={styles.titleCol}>
              <Text style={styles.name} numberOfLines={1}>
                {plant.customName}
              </Text>
              {name && (
                <Text style={styles.species} numberOfLines={1}>
                  {name}
                </Text>
              )}
            </View>
            <HealthScoreBadge score={plant.healthScore} locale={locale} size={48} />
          </View>

          <View style={styles.metaRow}>
            {plant.lastWatered && (
              <Text style={styles.meta}>💧 {formatDate(plant.lastWatered, locale)}</Text>
            )}
            {plant.speciesId && <Text style={styles.metaLinked}>🌱 {m.plants.linked}</Text>}
          </View>
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
    aspectRatio: 4 / 3,
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
    fontSize: 40,
  },
  body: {
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  species: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#8B9097',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meta: {
    fontSize: 12,
    color: '#60646C',
  },
  metaLinked: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
});
