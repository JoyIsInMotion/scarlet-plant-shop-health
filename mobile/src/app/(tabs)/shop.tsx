import { useCallback, useEffect, useState } from 'react';
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
import { ProductCard } from '@/components/product-card';
import { useAuth } from '@/context/auth';
import { ApiError, getProducts } from '@/lib/api';
import { Product } from '@/lib/types';

function ShopContent() {
  const { authedRequest } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await authedRequest((token) => getProducts({}, token));
      setProducts(list.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load products.');
    }
  }, [authedRequest]);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

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
            load().finally(() => setLoading(false));
          }}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductCard product={item} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No products available yet.</Text>
        </View>
      }
    />
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
  separator: {
    height: 12,
  },
  errorText: {
    color: '#C8102E',
    fontSize: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: '#60646C',
    fontSize: 15,
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
