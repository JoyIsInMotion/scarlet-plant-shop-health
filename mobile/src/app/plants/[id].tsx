import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthGuard } from '@/components/auth-guard';
import { AIAnalysisCard } from '@/components/ai-analysis-card';
import { HealthScoreBadge } from '@/components/health-score-badge';
import { useAuth } from '@/context/auth';
import { ApiError, getPlant, getPlantAnalyses, runPlantAnalysis } from '@/lib/api';
import { Locale, pickLocalized, speciesName, useI18n } from '@/lib/i18n';
import { AIAnalysis, Localized, Plant } from '@/lib/types';

function formatDate(value: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

// Native Alert has no web fallback; surface errors as a simple alert/console.
function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function PlantDetailContent({ id }: { id: string }) {
  const { authedRequest } = useAuth();
  const { locale, m } = useI18n();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [latest, setLatest] = useState<AIAnalysis | null>(null);
  const [freshAdvice, setFreshAdvice] = useState<Localized | null>(null);
  const [freshBasics, setFreshBasics] =
    useState<Record<string, { en: string | null; bg: string | null }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, history] = await Promise.all([
        authedRequest((token) => getPlant(id, token)),
        authedRequest((token) => getPlantAnalyses(id, token, { limit: 1 })).catch(() => null),
      ]);
      setPlant(p);
      setLatest(history?.analyses?.[0] ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : m.plants.notFound);
    }
  }, [authedRequest, id, m.plants.notFound]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const onRunAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const result = await authedRequest((token) => runPlantAnalysis(id, token));
      setLatest(result.analysis);
      setFreshAdvice(result.advice);
      setFreshBasics(result.careBasics);
      // Refresh the plant so the (possibly updated) health score shows.
      const updated = await authedRequest((token) => getPlant(id, token));
      setPlant(updated);
    } catch (e) {
      notify(m.common.error, e instanceof ApiError ? e.message : m.ai.analysisFailed);
    } finally {
      setAnalyzing(false);
    }
  }, [authedRequest, id, m]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !plant) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? m.plants.notFound}</Text>
        <Pressable
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          onPress={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}>
          <Text style={styles.retryText}>{m.common.retry}</Text>
        </Pressable>
      </View>
    );
  }

  const name = speciesName(plant.species, locale);
  const species = plant.species;
  const difficulty = species?.careDifficulty;
  const nativeRegion = species
    ? pickLocalized(
        species.nativeRegionBg || species.nativeRegionEn
          ? { bg: species.nativeRegionBg ?? '', en: species.nativeRegionEn ?? '' }
          : null,
        locale
      )
    : null;

  return (
    <>
      <Stack.Screen options={{ title: plant.customName }} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Photo */}
        <View style={styles.photoWrap}>
          {plant.imageUrl ? (
            <Image source={{ uri: plant.imageUrl }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>🪴</Text>
            </View>
          )}
        </View>

        {/* Title + health */}
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={styles.title}>{plant.customName}</Text>
            {name && <Text style={styles.species}>{name}</Text>}
          </View>
          <HealthScoreBadge score={plant.healthScore} locale={locale} size={68} showLabel />
        </View>

        {/* Care stats */}
        <View style={styles.statsCard}>
          {plant.lastWatered && (
            <Text style={styles.statLine}>
              💧 {m.plants.lastWatered}: {formatDate(plant.lastWatered, locale)}
            </Text>
          )}
          {plant.speciesId && (
            <Text style={styles.statLineGreen}>
              🌱 {m.plants.linked}
              {plant.speciesConfirmed ? ` · ${m.plants.speciesConfirmed}` : ''}
            </Text>
          )}
        </View>

        {/* Species info */}
        {species && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>{m.catalog.title}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{m.catalog.scientificName}</Text>
              <Text style={styles.infoValueItalic}>{species.scientificName}</Text>
            </View>
            {species.family && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{m.catalog.family}</Text>
                <Text style={styles.infoValue}>{species.family}</Text>
              </View>
            )}
            {nativeRegion && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{m.catalog.nativeRegion}</Text>
                <Text style={styles.infoValue}>{nativeRegion}</Text>
              </View>
            )}
            {difficulty && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{m.catalog.careDifficulty}</Text>
                <Text style={styles.infoValue}>{m.catalog[difficulty]}</Text>
              </View>
            )}
          </View>
        )}

        {/* AI analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{m.plants.latestAnalysis}</Text>
          {latest ? (
            <AIAnalysisCard analysis={latest} advice={freshAdvice} careBasics={freshBasics} />
          ) : (
            <Text style={styles.noAnalysis}>{m.plants.noAnalysis}</Text>
          )}
        </View>

        {/* Run analysis */}
        <Pressable
          style={({ pressed }) => [
            styles.analyzeButton,
            pressed && styles.pressed,
            analyzing && styles.buttonDisabled,
          ]}
          onPress={onRunAnalysis}
          disabled={analyzing}>
          {analyzing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.analyzeText}>🔬 {m.ai.runAnalysis}</Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <AuthGuard>
      <PlantDetailContent id={id} />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  photoWrap: {
    aspectRatio: 4 / 3,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F1F5F2',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 64,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleCol: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#11181C',
  },
  species: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#8B9097',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ECEEF1',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  statLine: {
    fontSize: 14,
    color: '#4B5563',
  },
  statLineGreen: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ECEEF1',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#9AA0A6',
  },
  infoValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  infoValueItalic: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    flexShrink: 1,
    textAlign: 'right',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  noAnalysis: {
    fontSize: 14,
    color: '#60646C',
    lineHeight: 20,
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 16,
  },
  analyzeButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginBottom: 8,
  },
  analyzeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
  errorText: {
    color: '#C8102E',
    fontSize: 15,
    textAlign: 'center',
  },
  retry: {
    borderWidth: 1,
    borderColor: '#C8102E',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: '#C8102E',
    fontWeight: '600',
  },
});
