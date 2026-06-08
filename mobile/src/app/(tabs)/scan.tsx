import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AIAnalysisCard } from '@/components/ai-analysis-card';
import { useAuth } from '@/context/auth';
import { ApiError, quickScan, type ScanImage } from '@/lib/api';
import { PermissionDeniedError, pickScanImage } from '@/lib/image-scan';
import { useI18n } from '@/lib/i18n';
import { getItem, setItem } from '@/lib/storage';
import type { AIAnalysisResult } from '@/lib/types';

// Tracks the last anonymous (logged-out) scan so guests are held to one per
// day, mirroring the web's cookie. We enforce it on the client because the
// server's cookie can't round-trip from the Web export (cross-origin).
const ANON_SCAN_KEY = 'scan.anonUsedAt';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const COLORS = {
  scarlet: '#C2375A',
  scarletLight: '#FCEEF3',
  surface: '#FFFFFF',
  foreground: '#1A0D12',
  muted: '#7A6070',
  border: '#EDD8E2',
  cream: '#FBF5F8',
  green: '#16A34A',
  greenDark: '#15803D',
  greenBg: '#ECFDF5',
};

export default function ScanScreen() {
  const { m } = useI18n();
  const router = useRouter();
  const { authedRequest, isAuthenticated } = useAuth();

  const [image, setImage] = useState<ScanImage | null>(null);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Logged-out visitors get one free scan per day; after that we prompt them to
  // log in.
  const [limitReached, setLimitReached] = useState(false);

  // On open, restore whether a guest has already used today's free scan.
  useEffect(() => {
    if (isAuthenticated) return;
    let active = true;
    getItem(ANON_SCAN_KEY)
      .then((v) => {
        const usedAt = v ? Number(v) : NaN;
        if (active && Number.isFinite(usedAt) && Date.now() - usedAt < ONE_DAY_MS) {
          setLimitReached(true);
        }
      })
      .catch(() => {
        /* no stored value — allow the free scan */
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  async function pick(source: 'camera' | 'library') {
    setError(null);
    try {
      const picked = await pickScanImage(source);
      if (picked) {
        setImage(picked);
        setResult(null);
      }
    } catch (e) {
      setError(e instanceof PermissionDeniedError ? m.ai.permissionDenied : m.ai.analysisFailed);
    }
  }

  async function scan() {
    if (!image) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = isAuthenticated
        ? await authedRequest((token) => quickScan(image, token))
        : await quickScan(image);
      setResult(res);
      // A logged-out visitor has now used their one free scan for the day.
      if (!isAuthenticated) {
        await setItem(ANON_SCAN_KEY, String(Date.now())).catch(() => {});
        setLimitReached(true);
      }
    } catch (e) {
      // Anonymous visitor who already used their free scan today.
      if (e instanceof ApiError && e.code === 'ANON_LIMIT') {
        await setItem(ANON_SCAN_KEY, String(Date.now())).catch(() => {});
        setLimitReached(true);
      } else {
        setError(e instanceof ApiError ? e.message : m.ai.analysisFailed);
      }
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setImage(null);
    setResult(null);
    setError(null);
  }

  // Guests who've used today's free scan are blocked; signing in lifts it.
  const guestLimited = limitReached && !isAuthenticated;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{m.ai.quickScan.toUpperCase()}</Text>
        <Text style={styles.title}>{m.ai.quickScan}</Text>
        <Text style={styles.note}>{m.ai.quickScanNote}</Text>
      </View>

      {/* Free-scan hint for logged-out visitors. */}
      {!isAuthenticated && !guestLimited && !result && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintText}>✨ {m.ai.freeScanHint}</Text>
        </View>
      )}

      {/* Picker / preview */}
      {image ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
          {!result && !analyzing && (
            <Pressable
              onPress={reset}
              hitSlop={8}
              style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
              accessibilityLabel={m.ai.removePhoto}>
              <Text style={styles.removeBtnText}>✕</Text>
            </Pressable>
          )}
        </View>
      ) : guestLimited ? null : (
        <View style={styles.pickRow}>
          <Pressable
            onPress={() => pick('camera')}
            style={({ pressed }) => [styles.pickBtn, pressed && styles.pressed]}>
            <Text style={styles.pickEmoji}>📷</Text>
            <Text style={styles.pickText}>{m.ai.takePhoto}</Text>
          </Pressable>
          <Pressable
            onPress={() => pick('library')}
            style={({ pressed }) => [styles.pickBtn, pressed && styles.pressed]}>
            <Text style={styles.pickEmoji}>🖼️</Text>
            <Text style={styles.pickText}>{m.ai.choosePhoto}</Text>
          </Pressable>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Scan action */}
      {image && !result && !guestLimited && (
        <Pressable
          onPress={scan}
          disabled={analyzing}
          style={({ pressed }) => [
            styles.scanBtn,
            analyzing && styles.btnDisabled,
            pressed && styles.pressed,
          ]}>
          {analyzing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.scanBtnText}>🔬 {m.ai.scanButton}</Text>
          )}
        </Pressable>
      )}

      {/* Result */}
      {result && (
        <>
          <AIAnalysisCard
            analysis={result.analysis}
            advice={result.advice}
            careBasics={result.careBasics}
          />
          {/* Logged-in users can keep scanning (5/day); guests are nudged to
              log in for more after their one free scan. */}
          {isAuthenticated && (
            <Pressable
              onPress={reset}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
              <Text style={styles.secondaryBtnText}>{m.ai.scanAnother}</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Log-in prompt once a guest has used their free scan. */}
      {guestLimited && (
        <View style={styles.promptCard}>
          <Text style={styles.promptTitle}>{m.ai.limitReachedTitle}</Text>
          <Text style={styles.promptDesc}>{m.ai.limitReachedDesc}</Text>
          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}>
            <Text style={styles.loginBtnText}>{m.nav.login}</Text>
          </Pressable>
        </View>
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
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: COLORS.greenBg,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.greenDark,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  hintBanner: {
    backgroundColor: COLORS.greenBg,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.greenDark,
    fontWeight: '600',
  },
  promptCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.scarletLight,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.foreground,
    textAlign: 'center',
  },
  promptDesc: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 6,
  },
  loginBtn: {
    backgroundColor: COLORS.scarlet,
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pickRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.cream,
  },
  pickEmoji: {
    fontSize: 30,
  },
  pickText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  previewWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.cream,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  scanBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: COLORS.scarlet,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: COLORS.scarlet,
    fontSize: 14,
    backgroundColor: COLORS.scarletLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
});
