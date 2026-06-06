import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthGuard } from '@/components/auth-guard';
import { ProductCard } from '@/components/product-card';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { ApiError, getProducts, ProductQuery } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Product, ProductCategory } from '@/lib/types';

const COLORS = {
  scarlet: '#C2375A',
  scarletLight: '#FCEEF3',
  surface: '#FFFFFF',
  foreground: '#1A0D12',
  muted: '#7A6070',
  border: '#EDD8E2',
  chipBg: '#F7EEF2',
};

const PAGE_SIZE = 10;

const CATEGORY_ORDER: ProductCategory[] = [
  'bouquet',
  'potted_plant',
  'succulent',
  'tropical',
  'seasonal',
  'accessories',
];

type SortKey = 'newest' | 'priceAsc' | 'priceDesc';

const SORTS: Record<SortKey, Pick<ProductQuery, 'sort' | 'order'>> = {
  newest: { sort: 'createdAt', order: 'desc' },
  priceAsc: { sort: 'price', order: 'asc' },
  priceDesc: { sort: 'price', order: 'desc' },
};

function ShopContent() {
  const { authedRequest } = useAuth();
  const { locale, m } = useI18n();
  const router = useRouter();
  const { count } = useCart();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');
  // Category + sort chips stay collapsed until the filter icon is tapped.
  const [showFilters, setShowFilters] = useState(false);

  // Highlights the filter toggle when a non-default filter is active.
  const filtersActive = category !== null || sort !== 'newest';

  // Data + paging
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against out-of-order responses when filters change rapidly.
  const requestId = useRef(0);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useCallback(
    (offset: number): ProductQuery => ({
      limit: PAGE_SIZE,
      offset,
      category: category ?? undefined,
      search: search || undefined,
      ...SORTS[sort],
    }),
    [category, search, sort]
  );

  // Loads the first page for the current filters. Each call bumps requestId so a
  // slow earlier response can't overwrite a newer one.
  const loadFirstPage = useCallback(async () => {
    const id = ++requestId.current;
    setError(null);
    try {
      const res = await authedRequest((token) => getProducts(query(0), token));
      if (id !== requestId.current) return;
      setProducts(res.items);
      setTotal(res.total);
      setHasMore(res.hasMore);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof ApiError ? e.message : m.shop.loadError);
    }
  }, [authedRequest, query, m.shop.loadError]);

  // Re-run whenever filters change.
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadFirstPage().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const res = await authedRequest((token) => getProducts(query(products.length), token));
      // Ignore if filters changed mid-flight.
      if (id !== requestId.current) return;
      setProducts((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
    } catch {
      /* keep what we have; user can pull to refresh */
    } finally {
      setLoadingMore(false);
    }
  }, [authedRequest, query, products.length, hasMore, loading, loadingMore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirstPage();
    setRefreshing(false);
  }, [loadFirstPage]);

  const header = (
    <View style={styles.header}>
      {/* Quick access to the cart and order history (the cart isn't in the
          bottom tab bar — these are the entry points). */}
      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          onPress={() => router.push('/cart')}>
          <Text style={styles.actionEmoji}>🛒</Text>
          <Text style={styles.actionText}>{m.cart.title}</Text>
          {count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          onPress={() => router.push('/orders')}>
          <Text style={styles.actionEmoji}>📦</Text>
          <Text style={styles.actionText}>{m.orders.myOrders}</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={m.shop.searchPlaceholder}
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
              <Text style={styles.clearIcon}>✕</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setShowFilters((v) => !v)}
          accessibilityLabel={m.shop.filters}
          style={({ pressed }) => [
            styles.filterToggle,
            (showFilters || filtersActive) && styles.filterToggleActive,
            pressed && styles.pressed,
          ]}>
          <FilterLinesIcon active={showFilters || filtersActive} />
          <Text
            style={[
              styles.filterToggleText,
              (showFilters || filtersActive) && styles.filterToggleTextActive,
            ]}>
            {m.shop.filters}
          </Text>
          {filtersActive && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      {showFilters && (
        <>
          {/* Category filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}>
            <Chip label={m.shop.all} active={category === null} onPress={() => setCategory(null)} />
            {CATEGORY_ORDER.map((c) => (
              <Chip
                key={c}
                label={m.home.categories[c]}
                active={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </ScrollView>

          {/* Sort chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}>
            <Chip
              label={m.shop.sortNewest}
              active={sort === 'newest'}
              onPress={() => setSort('newest')}
              subtle
            />
            <Chip
              label={m.shop.sortPriceAsc}
              active={sort === 'priceAsc'}
              onPress={() => setSort('priceAsc')}
              subtle
            />
            <Chip
              label={m.shop.sortPriceDesc}
              active={sort === 'priceDesc'}
              onPress={() => setSort('priceDesc')}
              subtle
            />
          </ScrollView>
        </>
      )}

      {!loading && !error && (
        <Text style={styles.count}>
          {total} {m.shop.resultsCount}
        </Text>
      )}
    </View>
  );

  if (error && products.length === 0) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            onPress={() => {
              setLoading(true);
              loadFirstPage().finally(() => setLoading(false));
            }}>
            <Text style={styles.retryText}>{m.common.retry}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductCard product={item} locale={locale} />}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? <ActivityIndicator style={styles.footer} color={COLORS.scarlet} /> : null
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.scarlet} />
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{m.shop.empty}</Text>
          </View>
        )
      }
    />
  );
}

// The widely-used "filter" glyph: three horizontal bars decreasing in width
// (a funnel). Drawn with Views so it needs no icon font.
function FilterLinesIcon({ active }: { active: boolean }) {
  const color = active ? COLORS.scarlet : COLORS.muted;
  return (
    <View style={styles.filterLines}>
      <View style={[styles.filterLine, { width: 18, backgroundColor: color }]} />
      <View style={[styles.filterLine, { width: 12, backgroundColor: color }]} />
      <View style={[styles.filterLine, { width: 6, backgroundColor: color }]} />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  subtle,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  subtle?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        subtle && styles.chipSubtle,
        active && (subtle ? styles.chipSubtleActive : styles.chipActive),
        pressed && styles.pressed,
      ]}>
      <Text
        style={[
          styles.chipText,
          active && (subtle ? styles.chipSubtleTextActive : styles.chipTextActive),
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function ShopScreen() {
  return (
    <AuthGuard>
      <ShopContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    gap: 12,
    paddingBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.scarletLight,
  },
  actionEmoji: {
    fontSize: 16,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.scarlet,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.scarlet,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.chipBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterToggleActive: {
    backgroundColor: COLORS.scarletLight,
    borderColor: COLORS.scarlet,
  },
  filterLines: {
    alignItems: 'center',
    gap: 3,
  },
  filterLine: {
    height: 2.5,
    borderRadius: 2,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: COLORS.muted,
  },
  filterToggleTextActive: {
    color: COLORS.scarlet,
  },
  filterDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.scarlet,
  },
  searchIcon: {
    fontSize: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.foreground,
    padding: 0,
  },
  clearIcon: {
    fontSize: 14,
    color: COLORS.muted,
    paddingHorizontal: 2,
  },
  chipRow: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.scarletLight,
  },
  chipActive: {
    backgroundColor: COLORS.scarlet,
  },
  chipSubtle: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
  },
  chipSubtleActive: {
    backgroundColor: COLORS.foreground,
    borderColor: COLORS.foreground,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.scarlet,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipSubtleTextActive: {
    color: '#FFFFFF',
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  footer: {
    paddingVertical: 18,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 14,
  },
  errorText: {
    color: COLORS.scarlet,
    fontSize: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 15,
  },
  retry: {
    borderWidth: 1,
    borderColor: COLORS.scarlet,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  retryText: {
    color: COLORS.scarlet,
    fontWeight: '600',
  },
});
