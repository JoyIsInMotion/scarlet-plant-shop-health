import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCart } from '@/context/cart';
import { useI18n, type Locale } from '@/lib/i18n';
import { Product } from '@/lib/types';

function formatPrice(price: string): string {
  const n = Number(price);
  return Number.isFinite(n) ? `${n.toFixed(2)} лв.` : price;
}

export function ProductCard({ product, locale = 'bg' }: { product: Product; locale?: Locale }) {
  const { m } = useI18n();
  const router = useRouter();
  const { items, add, update } = useCart();

  const name = locale === 'en' ? product.nameEn || product.nameBg : product.nameBg || product.nameEn;
  const outOfStock = product.stock <= 0;
  // Current quantity already in the cart drives the +/stepper toggle.
  const qty = items.find((i) => i.id === product.id)?.quantity ?? 0;
  const atStock = qty >= product.stock;

  function addOne() {
    if (outOfStock) return;
    add({
      id: product.id,
      name,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      stock: product.stock,
    });
  }

  return (
    <View style={styles.card}>
      {/* Tapping the product opens its detail page. */}
      <Pressable
        style={({ pressed }) => [styles.tapArea, pressed && styles.pressed]}
        onPress={() => router.push(`/shop/${product.id}` as Href)}
        accessibilityLabel={`${name} — ${m.shop.viewDetails}`}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={product.id}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>🌸</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            <Text style={styles.stock}>
              {outOfStock
                ? m.shop.outOfStock
                : qty > 0
                  ? `${qty} ${m.shop.inCart}`
                  : `${product.stock} ${m.shop.stockUnit}`}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Add control: a single "+" until the item is in the cart, then an
          inline −/+ stepper so quantity is adjustable right from the list. */}
      {qty === 0 ? (
        <Pressable
          onPress={addOne}
          disabled={outOfStock}
          accessibilityLabel={m.shop.addToCart}
          style={({ pressed }) => [
            styles.addBtn,
            outOfStock && styles.addBtnDisabled,
            pressed && !outOfStock && styles.pressed,
          ]}>
          <Text style={[styles.addBtnText, outOfStock && styles.addBtnTextDisabled]}>
            {outOfStock ? '—' : '+'}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.stepper}>
          <Pressable
            onPress={() => update(product.id, qty - 1)}
            style={styles.stepBtn}
            hitSlop={6}
            accessibilityLabel="−">
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.qty}>{qty}</Text>
          <Pressable
            onPress={() => update(product.id, qty + 1)}
            disabled={atStock}
            style={[styles.stepBtn, atStock && styles.stepDisabled]}
            hitSlop={6}
            accessibilityLabel="+">
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F7F8FA',
  },
  tapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#ECEEF1',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  price: {
    fontSize: 15,
    color: '#C2375A',
    fontWeight: '700',
  },
  stock: {
    fontSize: 11,
    color: '#7A6070',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C2375A',
  },
  addBtnDisabled: {
    backgroundColor: '#E5E0E3',
  },
  addBtnText: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  addBtnTextDisabled: {
    color: '#A9A0A5',
  },
  // Inline quantity stepper (mirrors the cart row stepper).
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDD8E2',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  stepBtn: {
    width: 34,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    opacity: 0.35,
  },
  stepText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C2375A',
  },
  qty: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#11181C',
  },
  pressed: {
    opacity: 0.8,
  },
});
