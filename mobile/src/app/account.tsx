import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthGuard } from '@/components/auth-guard';
import { useAuth } from '@/context/auth';
import { ApiError, updateMe } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const COLORS = {
  scarlet: '#C2375A',
  surface: '#FFFFFF',
  foreground: '#1A0D12',
  muted: '#7A6070',
  border: '#EDD8E2',
  cream: '#FBF5F8',
  green: '#1F9D63',
  greenBg: '#E6F6EE',
};

function AccountContent() {
  const { m } = useI18n();
  const { user, authedRequest, updateUser, logout } = useAuth();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await authedRequest((token) =>
        updateMe(token, { phone: phone.trim() || null })
      );
      await updateUser(updated);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : m.account.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {/* Identity */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        {/* Editable phone */}
        <View style={styles.cardCol}>
          <Text style={styles.label}>{m.account.phone}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setSaved(false);
            }}
            placeholder={m.account.phonePlaceholder}
            placeholderTextColor={COLORS.muted}
            keyboardType="phone-pad"
            autoCorrect={false}
          />
          <Text style={styles.hint}>{m.account.phoneHint}</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}
          {saved && <Text style={styles.savedText}>✓ {m.account.saved}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              saving && styles.btnDisabled,
              pressed && styles.pressed,
            ]}
            disabled={saving}
            onPress={save}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>{m.common.save}</Text>
            )}
          </Pressable>
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          onPress={logout}>
          <Text style={styles.logoutText}>{m.account.logout}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function AccountScreen() {
  return (
    <AuthGuard>
      <AccountContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
    // Center the account form at a readable width on tablets / the web build.
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cardCol: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.scarlet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  email: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.cream,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.foreground,
  },
  hint: {
    fontSize: 12,
    color: COLORS.muted,
  },
  errorText: {
    color: COLORS.scarlet,
    fontSize: 13,
  },
  savedText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: COLORS.scarlet,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  logoutBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 6,
  },
  logoutText: {
    color: COLORS.scarlet,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
