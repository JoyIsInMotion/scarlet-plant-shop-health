import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
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
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const name = locale === 'en' ? product.nameEn || product.nameBg : product.nameBg || product.nameEn;
  const outOfStock = product.stock <= 0;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function handleAdd() {
    if (outOfStock) return;
    add({
      id: product.id,
      name,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      stock: product.stock,
    });
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1300);
  }

  return (
    <View style={styles.card}>
      {product.imageUrl ? (
        <Image
          source={{ uri: product.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={150}
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
            {outOfStock ? m.shop.outOfStock : `${product.stock} ${m.shop.stockUnit}`}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={handleAdd}
        disabled={outOfStock}
        accessibilityLabel={m.shop.addToCart}
        style={({ pressed }) => [
          styles.addBtn,
          added && styles.addBtnAdded,
          outOfStock && styles.addBtnDisabled,
          pressed && !outOfStock && styles.pressed,
        ]}>
        <Text style={[styles.addBtnText, outOfStock && styles.addBtnTextDisabled]}>
          {outOfStock ? '—' : added ? '✓' : '+'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F7F8FA',
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
  addBtnAdded: {
    backgroundColor: '#1F9D63',
  },
  addBtnDisabled: {
    backgroundColor: '#E5E0E3',
  },
  addBtnText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addBtnTextDisabled: {
    color: '#A9A0A5',
  },
  pressed: {
    opacity: 0.8,
  },
});
