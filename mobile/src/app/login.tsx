import { Redirect, Stack, useRouter, type Href } from 'expo-router';
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

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — no reason to show the form.
  if (!isLoading && isAuthenticated) {
    return <Redirect href={HOME} />;
  }

  // The login screen is often reached via an AuthGuard redirect (which replaces
  // history), so there may be no entry to pop — fall back to Home.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(HOME));

  async function onSubmit() {
    setError(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length === 0) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedEmail, password);
      router.replace(HOME);
    } catch (e) {
      // 401 surfaces as "Invalid credentials" from the API; network/other
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your Scarlet account.</Text>

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
          placeholder="Password"
          placeholderTextColor="#9AA0A6"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
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
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </Pressable>
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
});
