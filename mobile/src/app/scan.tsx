import { StyleSheet, Text, View } from 'react-native';
import { AuthGuard } from '@/components/auth-guard';

function ScanContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan</Text>
      <Text style={styles.subtitle}>AI plant health scanning coming soon.</Text>
    </View>
  );
}

export default function ScanScreen() {
  return (
    <AuthGuard>
      <ScanContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    color: '#60646C',
  },
});
