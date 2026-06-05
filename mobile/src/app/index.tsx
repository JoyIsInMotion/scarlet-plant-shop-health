import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Scarlet</Text>
      <Text style={styles.subtitle}>
        Your boutique flower shop &amp; plant care companion.
      </Text>

      <Link href="/login" style={styles.link}>
        Log in to get started
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
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
  link: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#C8102E',
  },
});
