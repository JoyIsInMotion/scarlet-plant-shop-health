import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthGuard } from '@/components/auth-guard';
import { PlantCard } from '@/components/plant-card';
import { useAuth } from '@/context/auth';
import { ApiError, getPlants } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Plant } from '@/lib/types';

const PAGE_SIZE = 12;

function PlantsContent() {
  const { authedRequest } = useAuth();
  const { m } = useI18n();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards onEndReached from firing repeated page loads mid-flight.
  const loadingMoreRef = useRef(false);

  const loadPage = useCallback(
    async (offset: number) => {
      const res = await authedRequest((token) => getPlants(token, { limit: PAGE_SIZE, offset }));
      setTotal(res.total);
      setHasMore(res.hasMore);
      setPlants((prev) => (offset === 0 ? res.plants : [...prev, ...res.plants]));
    },
    [authedRequest]
  );

  const loadFirst = useCallback(async () => {
    setError(null);
    try {
      await loadPage(0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : m.plants.loadError);
    }
  }, [loadPage, m.plants.loadError]);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadFirst();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadFirst]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirst();
    setRefreshing(false);
  }, [loadFirst]);

  const onEndReached = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await loadPage(plants.length);
    } catch {
      // Keep what's already loaded; pull-to-refresh can retry.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loadPage, plants.length]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          onPress={() => {
            setLoading(true);
            loadFirst().finally(() => setLoading(false));
          }}>
          <Text style={styles.retryText}>{m.common.retry}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={plants}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.gridItem}>
          <PlantCard plant={item} />
        </View>
      )}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{m.plants.myPlants.toUpperCase()}</Text>
          <Text style={styles.title}>{m.plants.myPlants}</Text>
          <Text style={styles.subtitle}>{m.plants.manageCollection}</Text>
          {total != null && (
            <Text style={styles.count}>
              {total} {m.plants.plantsCount}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>{m.plants.noPlants}</Text>
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator />
          </View>
        ) : null
      }
    />
  );
}

export default function PlantsScreen() {
  return (
    <AuthGuard>
      <PlantsContent />
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
  list: {
    padding: 16,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
  },
  hero: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#059669',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#11181C',
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  separator: {
    height: 14,
  },
  footer: {
    paddingVertical: 20,
  },
  errorText: {
    color: '#C8102E',
    fontSize: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: '#60646C',
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
  pressed: {
    opacity: 0.7,
  },
  retryText: {
    color: '#C8102E',
    fontWeight: '600',
  },
});
