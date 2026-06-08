import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
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
import { useAuth } from '@/context/auth';
import { ApiError, getOrders, OrderStatus, OrderWithItems } from '@/lib/api';
import { useI18n, type Locale } from '@/lib/i18n';

const COLORS = {
  scarlet: '#C2375A',
  surface: '#FFFFFF',
  foreground: '#1A0D12',
  muted: '#7A6070',
  border: '#EDD8E2',
  cream: '#FBF5F8',
  chipBg: '#F7EEF2',
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92600A' },
  confirmed: { bg: '#DBEAFE', text: '#1D4ED8' },
  processing: { bg: '#EDE9FE', text: '#6D28D9' },
  shipped: { bg: '#E0E7FF', text: '#4338CA' },
  delivered: { bg: '#DCFCE7', text: '#15803D' },
  cancelled: { bg: '#FEE2E2', text: '#B91C1C' },
};

const PAGE_SIZE = 10;

function formatPrice(amount: string | number): string {
  return `${Number(amount).toFixed(2)} лв.`;
}

function formatDate(iso: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'bg-BG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function OrdersContent() {
  const { locale, m } = useI18n();
  const { authedRequest } = useAuth();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  const loadFirstPage = useCallback(async () => {
    const id = ++requestId.current;
    setError(null);
    try {
      const res = await authedRequest((token) => getOrders(token, { limit: PAGE_SIZE, offset: 0 }));
      if (id !== requestId.current) return;
      setOrders(res.items);
      setTotal(res.total);
      setHasMore(res.offset + res.items.length < res.total);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof ApiError ? e.message : m.orders.loadError);
    }
  }, [authedRequest, m.orders.loadError]);

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
      const res = await authedRequest((token) =>
        getOrders(token, { limit: PAGE_SIZE, offset: orders.length })
      );
      if (id !== requestId.current) return;
      // De-dupe by id to avoid duplicate React keys if a page overlaps.
      setOrders((prev) => {
        const seen = new Set(prev.map((o) => o.id));
        return [...prev, ...res.items.filter((o) => !seen.has(o.id))];
      });
      setHasMore(res.offset + res.items.length < res.total);
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  }, [authedRequest, orders.length, hasMore, loading, loadingMore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirstPage();
    setRefreshing(false);
  }, [loadFirstPage]);

  if (error && orders.length === 0) {
    return (
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
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={orders}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => <OrderCard order={item} locale={locale} m={m} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        !loading && total > 0 ? (
          <Text style={styles.count}>
            {total} {total === 1 ? m.orders.ordersOne : m.orders.ordersMany}
          </Text>
        ) : null
      }
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
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>{m.orders.noOrders}</Text>
          </View>
        )
      }
    />
  );
}

function OrderCard({
  order,
  locale,
  m,
}: {
  order: OrderWithItems;
  locale: Locale;
  m: ReturnType<typeof useI18n>['m'];
}) {
  const status = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.flex1}>
          <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>
            {m.orders.orderedOn} {formatDate(order.createdAt, locale)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>
              {m.orders.status[order.status] ?? order.status}
            </Text>
          </View>
          <Text style={styles.orderTotal}>{formatPrice(order.total)}</Text>
        </View>
      </View>

      {order.items.map((item, idx) => {
        const name = locale === 'en' ? item.nameEn : item.nameBg;
        return (
          <View key={idx} style={styles.lineItem}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.lineThumb} contentFit="cover" />
            ) : (
              <View style={[styles.lineThumb, styles.lineThumbPlaceholder]}>
                <Text style={styles.lineThumbEmoji}>🌸</Text>
              </View>
            )}
            <View style={styles.flex1}>
              <Text style={styles.lineName} numberOfLines={1}>
                {name ?? '—'}
              </Text>
              <Text style={styles.lineQty}>
                {item.quantity} × {formatPrice(item.unitPrice)}
              </Text>
            </View>
            <Text style={styles.lineSubtotal}>
              {formatPrice(Number(item.unitPrice) * item.quantity)}
            </Text>
          </View>
        );
      })}

      {order.notes ? (
        <Text style={styles.notes}>
          <Text style={styles.notesLabel}>{m.orders.notes}: </Text>
          {order.notes}
        </Text>
      ) : null}
    </View>
  );
}

export default function OrdersScreen() {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  list: {
    padding: 16,
    flexGrow: 1,
    // Center the order list at a readable width on tablets / the web build.
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  separator: {
    height: 12,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.cream,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.foreground,
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  lineThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.chipBg,
  },
  lineThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineThumbEmoji: {
    fontSize: 18,
  },
  lineName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },
  lineQty: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 1,
  },
  lineSubtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  flex1: {
    flex: 1,
  },
  notes: {
    fontSize: 12,
    color: COLORS.muted,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  notesLabel: {
    fontWeight: '700',
    color: COLORS.foreground,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 34,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.scarlet,
    fontSize: 15,
    textAlign: 'center',
  },
  retry: {
    borderWidth: 1,
    borderColor: COLORS.scarlet,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: COLORS.scarlet,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  footer: {
    paddingVertical: 18,
  },
});
