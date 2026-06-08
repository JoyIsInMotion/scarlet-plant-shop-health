import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProductCategory } from '@/lib/types';

const EMOJI: Record<ProductCategory, string> = {
  bouquet: '💐',
  potted_plant: '🪴',
  succulent: '🌵',
  tropical: '🌴',
  seasonal: '🌷',
  accessories: '🎀',
};

export function CollectionCard({
  category,
  label,
  count,
  unit,
  imageUrl,
}: {
  category: ProductCategory;
  label: string;
  count: number;
  unit: string;
  imageUrl: string | null;
}) {
  const router = useRouter();

  // Plain Pressable + router.push instead of <Link asChild>: on react-native-web
  // wrapping a Pressable in <Link asChild> drops the function-style, collapsing
  // the card. A fixed height (not aspectRatio) keeps web from collapsing too.
  return (
    <Pressable
      onPress={() => router.push(`/shop?category=${category}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          priority="high"
        />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderEmoji}>{EMOJI[category]}</Text>
        </View>
      )}
      {/* Dark scrim so the label stays legible over any photo. */}
      <View style={styles.scrim} />
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {count > 0 && (
          <Text style={styles.count}>
            {count} {unit}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 130,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#EDF4EF',
    shadowColor: '#1A0D12',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.9,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 44,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26,13,18,0.30)',
  },
  body: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
});
