import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Locale } from '@/lib/i18n';
import { Product } from '@/lib/types';

function formatPrice(price: string): string {
  const n = Number(price);
  return Number.isFinite(n) ? `${n.toFixed(2)} лв.` : price;
}

export function FeaturedProductCard({ product, locale }: { product: Product; locale: Locale }) {
  const router = useRouter();
  const name = locale === 'en' ? product.nameEn || product.nameBg : product.nameBg;

  return (
    <Pressable
      onPress={() => router.push(`/shop?category=${product.category}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderEmoji}>🌸</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <Text style={styles.price}>{formatPrice(product.price)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EDD8E2',
    padding: 10,
    gap: 6,
  },
  pressed: {
    opacity: 0.9,
  },
  imageWrap: {
    width: '100%',
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F7EEF2',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 34,
  },
  name: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1A0D12',
    lineHeight: 18,
    height: 36,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#C2375A',
  },
});
