import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCart } from '@/context/cart';
import { ApiError, getProduct, getProducts } from '@/lib/api';
import { useI18n, type Locale } from '@/lib/i18n';
import { Product } from '@/lib/types';

const COLORS = {
  scarlet: '#C2375A',
  scarletLight: '#FCEEF3',
  surface: '#FFFFFF',
  foreground: '#1A0D12',
  muted: '#7A6070',
  border: '#EDD8E2',
  cream: '#FBF5F8',
  green: '#1F9D63',
};

function formatPrice(price: string | number): string {
  const n = Number(price);
  return Number.isFinite(n) ? `${n.toFixed(2)} лв.` : String(price);
}

function productName(p: Product, locale: Locale): string {
  return locale === 'en' ? p.nameEn || p.nameBg : p.nameBg || p.nameEn;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, m } = useI18n();
  const router = useRouter();
  const { items, add, update } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qtyToAdd, setQtyToAdd] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const p = await getProduct(id);
      setProduct(p);
      // Same-category suggestions, excluding the current product.
      getProducts({ category: p.category, limit: 4 })
        .then((res) => setRelated(res.items.filter((r) => r.id !== p.id).slice(0, 3)))
        .catch(() => setRelated([]));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : m.shop.notFound);
    }
  }, [id, m.shop.notFound]);

  useEffect(() => {
    // `loading` already starts true and each detail view is a fresh push, so
    // there's no need to flip it on synchronously here.
    let active = true;
    load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.scarlet} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? m.shop.notFound}</Text>
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

  const name = productName(product, locale);
  const description = locale === 'en' ? product.descriptionEn : product.descriptionBg;
  const outOfStock = product.stock <= 0;
  const inCart = items.find((i) => i.id === product.id)?.quantity ?? 0;
  const maxAdd = Math.max(1, product.stock - inCart);

  function addToCart() {
    if (outOfStock) return;
    if (inCart === 0) {
      add({
        id: product!.id,
        name,
        price: Number(product!.price),
        imageUrl: product!.imageUrl,
        stock: product!.stock,
      });
    }
    update(product!.id, Math.min(inCart + qtyToAdd, product!.stock));
    setJustAdded(true);
  }

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* Image */}
        <View style={styles.imageWrap}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.placeholderEmoji}>🌸</Text>
            </View>
          )}
        </View>

        {/* Category + name + price */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{m.home.categories[product.category]}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        <Text style={[styles.stock, outOfStock && styles.stockOut]}>
          {outOfStock ? m.shop.outOfStock : `${m.shop.inStock} · ${product.stock} ${m.shop.stockUnit}`}
        </Text>

        {description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{m.shop.description}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
        ) : null}

        {/* Quantity + add to cart */}
        {!outOfStock && (
          <View style={styles.buyRow}>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setQtyToAdd((q) => Math.max(1, q - 1))}
                style={styles.stepBtn}
                hitSlop={6}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{qtyToAdd}</Text>
              <Pressable
                onPress={() => setQtyToAdd((q) => Math.min(maxAdd, q + 1))}
                disabled={qtyToAdd >= maxAdd}
                style={[styles.stepBtn, qtyToAdd >= maxAdd && styles.stepDisabled]}
                hitSlop={6}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={addToCart}
              style={({ pressed }) => [
                styles.addBtn,
                justAdded && styles.addBtnAdded,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.addBtnText}>
                {justAdded ? `✓ ${m.shop.added}` : m.shop.addToCart}
              </Text>
            </Pressable>
          </View>
        )}

        {justAdded && (
          <Pressable
            onPress={() => router.push('/cart')}
            style={({ pressed }) => [styles.cartLink, pressed && styles.pressed]}>
            <Text style={styles.cartLinkText}>🛒 {m.cart.title} →</Text>
          </Pressable>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{m.shop.relatedProducts}</Text>
            {related.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/shop/${r.id}` as Href)}
                style={({ pressed }) => [styles.relatedRow, pressed && styles.pressed]}>
                {r.imageUrl ? (
                  <Image source={{ uri: r.imageUrl }} style={styles.relatedThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.relatedThumb, styles.imagePlaceholder]}>
                    <Text style={styles.relatedEmoji}>🌸</Text>
                  </View>
                )}
                <View style={styles.flex1}>
                  <Text style={styles.relatedName} numberOfLines={1}>
                    {productName(r, locale)}
                  </Text>
                  <Text style={styles.relatedPrice}>{formatPrice(r.price)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 14,
    backgroundColor: COLORS.surface,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.cream,
    marginBottom: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 56,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.scarletLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: COLORS.scarlet,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.foreground,
    marginTop: 4,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.scarlet,
    marginTop: 2,
  },
  stock: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.green,
  },
  stockOut: {
    color: COLORS.muted,
  },
  section: {
    gap: 8,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.muted,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  buyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  stepBtn: {
    width: 40,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    opacity: 0.35,
  },
  stepText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.scarlet,
  },
  qty: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  addBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.scarlet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnAdded: {
    backgroundColor: COLORS.green,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cartLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  cartLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.scarlet,
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  relatedThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: COLORS.cream,
  },
  relatedEmoji: {
    fontSize: 24,
  },
  relatedName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  relatedPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.scarlet,
    marginTop: 2,
  },
  flex1: {
    flex: 1,
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
    opacity: 0.85,
  },
});
