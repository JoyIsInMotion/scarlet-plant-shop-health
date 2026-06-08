import { Link, Redirect, Stack, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/context/auth';
import { ApiError } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// expo-router serves the (tabs) group index at the clean "/" URL, but this
// version's typed-routes generator omits "/" (it only emits "/index"), so we
// cast to keep the URL clean on web.
const HOME = '/' as Href;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — no reason to show the form.
  if (!isLoading && isAuthenticated) {
    return <Redirect href={HOME} />;
  }

  // Mirrors login: we may arrive here via a redirect with no history to pop.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(HOME));

  async function onSubmit() {
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    // Match the backend's registerSchema so we fail fast with a clear message.
    if (trimmedName.length < 2) {
      setError('Please enter your name (at least 2 characters).');
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await register(trimmedName, trimmedEmail, password);
      router.replace(HOME);
    } catch (e) {
      // 409 surfaces as "Email already registered" from the API; network/other
      // errors carry their own message.
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Guarantee a way out even when we arrived here via a redirect. */}
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={goBack} hitSlop={12} style={styles.headerBack}>
              <Text style={styles.headerBackText}>‹ Home</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.form}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Join Scarlet to track and care for your plants.</Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#9AA0A6"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          editable={!submitting}
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9AA0A6"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!submitting}
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min. 8 characters)"
          placeholderTextColor="#9AA0A6"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
          editable={!submitting}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            submitting && styles.buttonDisabled,
          ]}
          onPress={onSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/login" replace asChild>
            <Pressable hitSlop={8} disabled={submitting}>
              <Text style={styles.footerLink}>Log in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  headerBack: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C2375A',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    padding: 24,
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    color: '#60646C',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D0D3D9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#11181C',
    backgroundColor: '#ffffff',
  },
  error: {
    color: '#C8102E',
    fontSize: 14,
  },
  button: {
    marginTop: 4,
    backgroundColor: '#C8102E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#60646C',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C2375A',
  },
});
