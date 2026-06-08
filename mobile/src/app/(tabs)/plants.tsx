import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthGuard } from '@/components/auth-guard';
import { PlantCard } from '@/components/plant-card';
import { useAuth } from '@/context/auth';
import { ApiError, getPlants } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { CareDifficulty, Plant } from '@/lib/types';

const PAGE_SIZE = 12;
const ALL_LIMIT = 500;

type DifficultyFilter = CareDifficulty | 'all';

function PlantsContent() {
  const { authedRequest } = useAuth();
  const { m } = useI18n();
  const router = useRouter();

  // ── Paginated data (no-filter mode) ──────────────────────────────────────
  const [plants, setPlants] = useState<Plant[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');

  // ── Full-list cache used when any filter is active ────────────────────────
  const [allPlants, setAllPlants] = useState<Plant[] | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);

  const isFiltering = search.trim().length > 0 || difficulty !== 'all';

  // ── Core data loading ─────────────────────────────────────────────────────
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

  // ── Load all plants when filters become active ────────────────────────────
  useEffect(() => {
    if (!isFiltering) {
      setAllPlants(null);
      return;
    }
    if (allPlants !== null) return;
    setLoadingAll(true);
    authedRequest((token) => getPlants(token, { limit: ALL_LIMIT, offset: 0 }))
      .then((res) => setAllPlants(res.plants))
      .catch(() => setAllPlants([]))
      .finally(() => setLoadingAll(false));
  }, [isFiltering, allPlants, authedRequest]);

  // ── Client-side filtering ─────────────────────────────────────────────────
  const displayedPlants = useMemo(() => {
    if (!isFiltering) return plants;
    const source = allPlants ?? [];
    const q = search.trim().toLowerCase();
    return source.filter((p) => {
      if (difficulty !== 'all' && p.species?.careDifficulty !== difficulty) return false;
      if (q) {
        const matches =
          p.customName.toLowerCase().includes(q) ||
          (p.species?.commonNameEn ?? '').toLowerCase().includes(q) ||
          (p.species?.commonNameBg ?? '').toLowerCase().includes(q) ||
          (p.species?.scientificName ?? '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [isFiltering, allPlants, plants, search, difficulty]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setAllPlants(null);
    await loadFirst();
    setRefreshing(false);
  }, [loadFirst]);

  // ── Infinite scroll (only in no-filter mode) ──────────────────────────────
  const onEndReached = useCallback(async () => {
    if (isFiltering || loadingMoreRef.current || !hasMore) return;
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
  }, [isFiltering, hasMore, loadPage, plants.length]);

  // ── Difficulty chip options ───────────────────────────────────────────────
  const CHIPS: Array<{ value: DifficultyFilter; label: string }> = [
    { value: 'all', label: m.shop.all },
    { value: 'easy', label: m.catalog.easy },
    { value: 'moderate', label: m.catalog.moderate },
    { value: 'difficult', label: m.catalog.difficult },
  ];

  // ── List header (hero + search + chips) ───────────────────────────────────
  const ListHeader = (
    <>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroText}>
            <Text style={styles.eyebrow}>{m.plants.myPlants.toUpperCase()}</Text>
            <Text style={styles.title}>{m.plants.myPlants}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/plants/new')}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            accessibilityLabel={m.plants.addPlant}>
            <Text style={styles.addBtnText}>+ {m.plants.addPlant}</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{m.plants.manageCollection}</Text>
        {total != null && !isFiltering && (
          <Text style={styles.count}>
            {total} {m.plants.plantsCount}
          </Text>
        )}
      </View>

      {/* Search input */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={m.plants.searchPlants}
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} style={styles.clearBtn} hitSlop={8}>
            <Text style={styles.clearBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Difficulty filter chips */}
      <View style={styles.chipsRow}>
        {CHIPS.map(({ value, label }) => (
          <Pressable
            key={value}
            onPress={() => setDifficulty(value)}
            style={[styles.chip, difficulty === value && styles.chipActive]}>
            <Text style={[styles.chipText, difficulty === value && styles.chipTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Results count / loading indicator while fetching all plants */}
      {isFiltering && (
        <View style={styles.filterMeta}>
          {loadingAll ? (
            <ActivityIndicator size="small" color={SCARLET} />
          ) : (
            <Text style={styles.filterCount}>
              {displayedPlants.length} {m.plants.plantsCount}
            </Text>
          )}
        </View>
      )}
    </>
  );

  // ── Error state ───────────────────────────────────────────────────────────
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
    <View style={styles.flex}>
      <FlatList
        data={displayedPlants}
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
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {isFiltering ? m.plants.noResults : m.plants.noPlants}
            </Text>
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

      {/* Floating add button */}
      <Pressable
        onPress={() => router.push('/plants/new')}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        accessibilityLabel={m.plants.addPlant}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

export default function PlantsScreen() {
  return (
    <AuthGuard>
      <PlantsContent />
    </AuthGuard>
  );
}

const SCARLET = '#C2375A';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  addBtn: {
    backgroundColor: SCARLET,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SCARLET,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: SCARLET,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
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
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
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
    marginBottom: 12,
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
  // ── Search ──────────────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#11181C',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 2,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // ── Filter chips ─────────────────────────────────────────────────────────
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: SCARLET,
    borderColor: SCARLET,
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  filterMeta: {
    marginBottom: 8,
    minHeight: 20,
    justifyContent: 'center',
  },
  filterCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  // ── List decorations ──────────────────────────────────────────────────────
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
  retryText: {
    color: '#C8102E',
    fontWeight: '600',
  },
});
