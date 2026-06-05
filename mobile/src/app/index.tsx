import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/auth';

export default function HomeScreen() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Welcome to Scarlet</Text>
        <Text style={styles.subtitle}>
          {isAuthenticated
            ? `Hi${user?.name ? `, ${user.name}` : ''}! Browse the shop or scan a plant.`
            : 'Your boutique flower shop & plant care companion.'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Link href="/shop" style={styles.navLink}>
          Shop
        </Link>
        <Link href="/plants" style={styles.navLink}>
          My plants
        </Link>
        <Link href="/scan" style={styles.navLink}>
          Scan a plant
        </Link>
      </View>

      {isAuthenticated ? (
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      ) : (
        <Link href="/login" style={styles.loginLink}>
          Log in to get started
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 28,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#60646C',
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    gap: 14,
  },
  navLink: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C8102E',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#C8102E',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  logoutText: {
    color: '#C8102E',
    fontSize: 16,
    fontWeight: '600',
  },
});
