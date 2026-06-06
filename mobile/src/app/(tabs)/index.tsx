import { useEffect, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CollectionCard } from '@/components/collection-card';
import { FeaturedProductCard } from '@/components/featured-product-card';
import { useAuth } from '@/context/auth';
import { getProducts } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Product, ProductCategory } from '@/lib/types';

// Brand palette mirrored from the website (web/src/app/globals.css).
const COLORS = {
  scarlet: '#C2375A',
  scarletLight: '#FCEEF3',
  botanicalDark: '#3D5A49',
  botanicalLight: '#EDF4EF',
  cream: '#FDF7F9',
  surface: '#FFFFFF',
  foreground: '#1A0D12',
  muted: '#7A6070',
  border: '#EDD8E2',
};

const CATEGORY_ORDER: ProductCategory[] = [
  'bouquet',
  'potted_plant',
  'succulent',
  'tropical',
  'seasonal',
  'accessories',
];

interface Collection {
  category: ProductCategory;
  cover: string | null;
  count: number;
}

export default function HomeScreen() {
  const { isAuthenticated, user, logout } = useAuth();
  const { locale, m } = useI18n();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>(
    CATEGORY_ORDER.map((category) => ({ category, cover: null, count: 0 }))
  );
  const [featured, setFeatured] = useState<Product[]>([]);

  // The products endpoint is public, so the landing screen shows real shop
  // photos without requiring a session. We fetch one product per category so
  // every collection gets its own cover photo (a single wide page can be
  // dominated by one category). Failures fall back to emoji art.
  useEffect(() => {
    let active = true;

    getProducts({ limit: 12 })
      .then((res) => {
        if (active) setFeatured(res.items.filter((p) => p.imageUrl));
      })
      .catch(() => {
        /* offline — best-selling row is simply hidden */
      });

    Promise.all(
      CATEGORY_ORDER.map((category) =>
        getProducts({ category, limit: 1 })
          .then((res) => ({ category, cover: res.items[0]?.imageUrl ?? null, count: res.total }))
          .catch(() => ({ category, cover: null, count: 0 }))
      )
    ).then((list) => {
      if (active) setCollections(list);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* ── GREETING ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>✦ {m.landing.tag.toUpperCase()}</Text>
          <Text style={styles.greeting}>
            {isAuthenticated && user?.name
              ? `${m.home.greeting}, ${user.name} 👋`
              : m.landing.heroTitle}
          </Text>
        </View>
      </View>

      {/* ── SEARCH (taps through to the shop) ── */}
      <Pressable
        onPress={() => router.push('/shop')}
        style={({ pressed }) => [styles.search, pressed && styles.pressed]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>{m.home.searchPlaceholder}</Text>
      </Pressable>

      {/* ── PROMO BANNER ── */}
      <Pressable
        onPress={() => router.push('/shop')}
        style={({ pressed }) => [styles.promo, pressed && styles.pressed]}>
        <View style={styles.promoText}>
          <Text style={styles.promoTitle}>{m.home.promoTitle}</Text>
          <Text style={styles.promoSub}>{m.home.promoSub}</Text>
          <View style={styles.promoBtn}>
            <Text style={styles.promoBtnText}>{m.landing.heroButton} →</Text>
          </View>
        </View>
        <Text style={styles.promoEmoji}>🌷</Text>
      </Pressable>

      {/* ── COLLECTIONS ── */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{m.home.collections}</Text>
        <Link href="/shop" style={styles.viewAll}>
          {m.home.viewAll} →
        </Link>
      </View>
      <View style={styles.grid}>
        {collections.map((c) => (
          <View key={c.category} style={styles.gridItem}>
            <CollectionCard
              category={c.category}
              label={m.home.categories[c.category]}
              count={c.count}
              unit={m.home.items}
              imageUrl={c.cover}
            />
          </View>
        ))}
      </View>

      {/* ── BEST SELLING ── */}
      {featured.length > 0 && (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{m.home.bestSelling}</Text>
            <Link href="/shop" style={styles.viewAll}>
              {m.home.viewAll} →
            </Link>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredRow}>
            {featured.map((p) => (
              <FeaturedProductCard key={p.id} product={p} locale={locale} />
            ))}
          </ScrollView>
        </>
      )}

      {/* ── PLANT HEALTH ── */}
      <Pressable
        onPress={() => router.push('/scan')}
        style={({ pressed }) => [styles.health, pressed && styles.pressed]}>
        <View style={styles.healthText}>
          <Text style={styles.healthEyebrow}>{m.landing.plantHealthEyebrow.toUpperCase()}</Text>
          <Text style={styles.healthTitle}>{m.landing.plantHealthCTA}</Text>
          <Text style={styles.healthDesc}>{m.landing.plantHealthDesc}</Text>
        </View>
        <Text style={styles.healthEmoji}>🪴</Text>
      </Pressable>

      {/* ── AUTH FOOTER ── */}
      {isAuthenticated ? (
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          onPress={logout}>
          <Text style={styles.logoutText}>{m.home.logout}</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push('/login')}
          style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}>
          <Text style={styles.loginText}>{m.home.login}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 18,
  },

  // Greeting
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.scarlet,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.foreground,
  },

  // Search
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F7EEF2',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchIcon: {
    fontSize: 15,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: COLORS.muted,
  },

  // Promo banner
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.scarlet,
    borderRadius: 22,
    padding: 22,
    shadowColor: COLORS.scarlet,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  promoText: {
    flex: 1,
    gap: 6,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 25,
  },
  promoSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  promoBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  promoBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.scarlet,
  },
  promoEmoji: {
    fontSize: 52,
    marginLeft: 8,
  },

  // Section headers
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.scarlet,
  },

  // Collections grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
  },

  // Best selling row
  featuredRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 2,
    paddingRight: 6,
  },

  // Plant health
  health: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.botanicalDark,
    borderRadius: 22,
    padding: 22,
  },
  healthText: {
    flex: 1,
    gap: 5,
  },
  healthEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.botanicalLight,
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 23,
  },
  healthDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.botanicalLight,
  },
  healthEmoji: {
    fontSize: 40,
  },

  // Footer
  logoutBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  logoutText: {
    color: COLORS.scarlet,
    fontSize: 15,
    fontWeight: '700',
  },
  loginBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: COLORS.foreground,
    borderRadius: 999,
    paddingVertical: 15,
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
