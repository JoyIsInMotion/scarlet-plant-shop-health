import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LanguageToggle } from '@/components/language-toggle';
import { useAuth } from '@/context/auth';
import { useI18n } from '@/lib/i18n';

const SCARLET = '#C2375A';
const FOREGROUND = '#1A0D12';
const MUTED = '#7A6070';
const BORDER = '#EDD8E2';

// Brand mark shown on the left of every tab header so "Scarlet" / "Скарлет"
// is always visible as the app logo. Tapping it returns home.
export function BrandLogo() {
  const router = useRouter();
  const { locale } = useI18n();
  return (
    <Pressable
      onPress={() => router.push('/')}
      style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
      accessibilityRole="button">
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>✿</Text>
      </View>
      <Text style={styles.brandText}>{locale === 'bg' ? 'Скарлет' : 'Scarlet'}</Text>
    </Pressable>
  );
}

// Right side of every tab header: an always-visible auth control (Log in →
// switches to an account chip + Log out when signed in) and the language toggle.
export function HeaderRight() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const { m } = useI18n();

  return (
    <View style={styles.right}>
      {isAuthenticated ? (
        <>
          <Pressable
            onPress={() => router.push('/account')}
            style={({ pressed }) => [styles.accountChip, pressed && styles.pressed]}
            accessibilityLabel={m.nav.account}>
            <Text style={styles.accountEmoji}>👤</Text>
            {!!user?.name && (
              <Text style={styles.accountName} numberOfLines={1}>
                {user.name.split(' ')[0]}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={logout}
            hitSlop={6}
            style={({ pressed }) => [styles.authBtn, pressed && styles.pressed]}>
            <Text style={styles.authBtnText}>{m.nav.logout}</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={() => router.push('/login')}
          style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}>
          <Text style={styles.loginBtnText}>{m.nav.login}</Text>
        </Pressable>
      )}
      <LanguageToggle />
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 16,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SCARLET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  brandText: {
    fontSize: 19,
    fontWeight: '800',
    color: FOREGROUND,
    letterSpacing: -0.3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 96,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F7EEF2',
  },
  accountEmoji: {
    fontSize: 13,
  },
  accountName: {
    fontSize: 12,
    fontWeight: '700',
    color: FOREGROUND,
    flexShrink: 1,
  },
  authBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  authBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F7EEF2',
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: SCARLET,
  },
  pressed: {
    opacity: 0.7,
  },
});
