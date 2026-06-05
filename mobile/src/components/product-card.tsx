import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { Product } from '@/lib/types';

function formatPrice(price: string): string {
  const n = Number(price);
  return Number.isFinite(n) ? `${n.toFixed(2)} лв.` : price;
}

export function ProductCard({ product }: { product: Product }) {
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
          {product.nameBg}
        </Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
      </View>
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
  price: {
    fontSize: 15,
    color: '#C8102E',
    fontWeight: '600',
  },
});
