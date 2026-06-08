import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  ApiError,
  CatalogSpecies,
  IdentifyResult,
  createPlant,
  identifyPlant,
  searchCatalog,
  uploadPlantImage,
} from '@/lib/api';
import { pickScanImage, PermissionDeniedError } from '@/lib/image-scan';
import { useI18n } from '@/lib/i18n';
import type { ScanImage } from '@/lib/api';

const COLORS = {
  scarlet: '#C2375A',
  scarletLight: '#FCEEF3',
  surface: '#FFFFFF',
  foreground: '#1A0D12',
  muted: '#7A6070',
  border: '#EDD8E2',
  cream: '#FBF5F8',
  green: '#16A34A',
  greenLight: '#ECFDF5',
  greenBorder: '#D1FAE5',
  amber: '#D97706',
  amberLight: '#FEF3C7',
};

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

function NewPlantContent() {
  const { m, locale } = useI18n();
  const { authedRequest } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    speciesId?: string;
    imageUri?: string;
    imageName?: string;
    imageMime?: string;
  }>();

  // Photo — pre-filled from scan if coming from scan screen
  const [image, setImage] = useState<ScanImage | null>(
    params.imageUri
      ? { uri: params.imageUri, name: params.imageName ?? 'plant.jpg', mimeType: params.imageMime ?? 'image/jpeg' }
      : null
  );

  // AI identification state
  const [identifying, setIdentifying] = useState(false);
  const [identification, setIdentification] = useState<IdentifyResult | null>(null);
  const [speciesId, setSpeciesId] = useState<string | null>(params.speciesId || null);
  const [speciesConfirmed, setSpeciesConfirmed] = useState(false);

  // Form fields
  const [name, setName] = useState(params.name ?? '');
  const [lastWatered, setLastWatered] = useState(''); // YYYY-MM-DD

  // Species search
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [speciesSuggestions, setSpeciesSuggestions] = useState<CatalogSpecies[]>([]);
  const [searchingSpecies, setSearchingSpecies] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<CatalogSpecies | null>(null);

  // Submit
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced species search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (speciesSearch.length < 2) {
      setSpeciesSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearchingSpecies(true);
      try {
        const res = await searchCatalog(speciesSearch);
        setSpeciesSuggestions(res.species ?? []);
      } catch {
        setSpeciesSuggestions([]);
      } finally {
        setSearchingSpecies(false);
      }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [speciesSearch]);

  async function pickPhoto(source: 'camera' | 'library') {
    try {
      const picked = await pickScanImage(source);
      if (!picked) return;
      setImage(picked);
      setIdentification(null);
      setSpeciesId(null);
      setSpeciesConfirmed(false);
      // AI identification
      setIdentifying(true);
      try {
        const result = await authedRequest((token) => identifyPlant(picked, token));
        setIdentification(result);
        if (result.identified) {
          // Auto-fill name from AI result if field is still empty
          const suggested =
            locale === 'bg'
              ? result.matchedCommonNameBg ?? result.matchedCommonNameEn ?? result.commonNameEn
              : result.matchedCommonNameEn ?? result.commonNameEn;
          if (suggested && !name.trim()) setName(suggested);
        }
      } catch {
        // silent — identification is optional
      } finally {
        setIdentifying(false);
      }
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        notify(m.common.error, m.ai.permissionDenied);
      }
    }
  }

  function confirmSpecies() {
    if (!identification?.matchedSpeciesId) return;
    setSpeciesId(identification.matchedSpeciesId);
    setSpeciesConfirmed(true);
  }

  function rejectSpecies() {
    setSpeciesId(null);
    setSpeciesConfirmed(false);
    setIdentification((prev) => prev ? { ...prev, matchedSpeciesId: null } : null);
  }

  function selectCatalogSpecies(s: CatalogSpecies) {
    setSelectedSpecies(s);
    setSpeciesId(s.id);
    setSpeciesSearch('');
    setSpeciesSuggestions([]);
  }

  function clearSelectedSpecies() {
    setSelectedSpecies(null);
    setSpeciesId(null);
  }

  // Resolved display name for the AI suggestion
  const suggestedName = identification?.identified
    ? locale === 'bg'
      ? identification.matchedCommonNameBg ?? identification.matchedCommonNameEn ?? identification.commonNameEn
      : identification.matchedCommonNameEn ?? identification.commonNameEn
    : null;

  async function save() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Required');
      return;
    }
    setNameError('');
    setSaving(true);
    try {
      const plant = await authedRequest((token) =>
        createPlant(
          {
            customName: trimmedName,
            speciesId: speciesId ?? null,
            lastWatered: lastWatered ? new Date(lastWatered).toISOString() : null,
            speciesConfirmed: speciesConfirmed,
          },
          token
        )
      );
      if (image) {
        try {
          await authedRequest((token) => uploadPlantImage(plant.id, image, token));
        } catch {
          // Photo upload failed — plant saved, tell the user
          notify(
            locale === 'en' ? 'Plant saved' : 'Растението е запазено',
            locale === 'en'
              ? 'Plant saved — but the photo failed to upload.'
              : 'Растението е запазено, но снимката не се качи.'
          );
          router.replace(`/plants/${plant.id}`);
          return;
        }
      }
      router.replace(`/plants/${plant.id}`);
    } catch (e) {
      notify(m.common.error, e instanceof ApiError ? e.message : m.plants.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/plants'));

  return (
    <>
      <Stack.Screen
        options={{
          title: m.plants.addPlant,
          headerLeft: () => (
            <Pressable onPress={goBack} hitSlop={12} style={styles.headerBack}>
              <Text style={styles.headerBackText}>‹ {m.common.back}</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">

          {/* ── PHOTO ── */}
          <View style={styles.card}>
            <Text style={styles.label}>{m.plants.photo}</Text>
            <Text style={styles.hint}>{m.plants.photoHint}</Text>

            {/* Preview or empty state */}
            <Pressable
              onPress={() => pickPhoto('library')}
              style={({ pressed }) => [styles.photoArea, pressed && styles.pressed]}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.photoPreview} contentFit="cover" />
              ) : (
                <View style={styles.photoEmpty}>
                  <Text style={styles.photoEmoji}>🪴</Text>
                  <Text style={styles.photoEmptyText}>
                    {locale === 'en' ? 'Tap to pick a photo' : 'Докоснете за снимка'}
                  </Text>
                </View>
              )}
            </Pressable>

            <View style={styles.photoRow}>
              <Pressable
                onPress={() => pickPhoto('camera')}
                style={({ pressed }) => [styles.photoBtn, pressed && styles.pressed]}>
                <Text style={styles.photoBtnText}>📷 {m.plants.takePhoto}</Text>
              </Pressable>
              <Pressable
                onPress={() => pickPhoto('library')}
                style={({ pressed }) => [styles.photoBtn, pressed && styles.pressed]}>
                <Text style={styles.photoBtnText}>🖼️ {m.plants.choosePhoto}</Text>
              </Pressable>
            </View>

            {/* AI identification result */}
            {identifying && (
              <View style={styles.identifyBanner}>
                <ActivityIndicator size="small" color={COLORS.green} />
                <Text style={styles.identifyText}>{m.plants.identifyingSpecies}</Text>
              </View>
            )}

            {!identifying && identification?.identified && identification.matchedSpeciesId && !speciesConfirmed && (
              <View style={styles.identifyCard}>
                <Text style={styles.identifyCardTitle}>
                  {m.plants.speciesIdentified}{' '}
                  <Text style={styles.bold}>{suggestedName}</Text>
                  {identification.scientificName ? (
                    <Text style={styles.sciName}> ({identification.scientificName})</Text>
                  ) : null}
                </Text>
                <Text style={styles.identifyCardHint}>{m.plants.careScheduleHint}</Text>
                <View style={styles.identifyBtnRow}>
                  <Pressable
                    onPress={confirmSpecies}
                    style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}>
                    <Text style={styles.confirmBtnText}>✓ {m.plants.confirmSpecies}</Text>
                  </Pressable>
                  <Pressable
                    onPress={rejectSpecies}
                    style={({ pressed }) => [styles.rejectBtn, pressed && styles.pressed]}>
                    <Text style={styles.rejectBtnText}>✕ {m.plants.rejectSpecies}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {!identifying && identification?.identified && speciesConfirmed && (
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedText}>
                  ✓ {m.plants.speciesConfirmedLabel}: <Text style={styles.bold}>{suggestedName}</Text>
                </Text>
                <Pressable onPress={rejectSpecies} hitSlop={8}>
                  <Text style={styles.undo}>✕</Text>
                </Pressable>
              </View>
            )}

            {!identifying && identification?.identified && !identification.matchedSpeciesId && (
              <View style={styles.identifyCard}>
                <Text style={styles.identifyCardTitle}>
                  {m.plants.speciesNotInDb}{' '}
                  <Text style={styles.bold}>
                    {identification.commonNameEn ?? identification.scientificName}
                  </Text>
                  {identification.scientificName && identification.commonNameEn && (
                    <Text style={styles.sciName}> ({identification.scientificName})</Text>
                  )}
                </Text>
                <Text style={styles.identifyCardHint}>{m.plants.speciesNotInDbHint}</Text>
              </View>
            )}

            {!identifying && identification && !identification.identified && (
              <View style={styles.notIdentified}>
                <Text style={styles.notIdentifiedText}>{m.plants.speciesNotIdentified}</Text>
              </View>
            )}
          </View>

          {/* ── NAME ── */}
          <View style={styles.card}>
            <Text style={styles.label}>{m.plants.plantName} *</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              value={name}
              onChangeText={(v) => { setName(v); setNameError(''); }}
              placeholder={m.plants.namePlaceholder}
              placeholderTextColor={COLORS.muted}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          {/* ── SPECIES SEARCH ── */}
          <View style={styles.card}>
            <Text style={styles.label}>
              {m.plants.species}{' '}
              <Text style={styles.optional}>({m.plants.lastWateredOptional})</Text>
            </Text>

            {selectedSpecies ? (
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedText}>
                  ✓ {selectedSpecies.commonNameEn ?? selectedSpecies.commonNameBg ?? selectedSpecies.scientificName}
                  <Text style={styles.sciName}> — {selectedSpecies.scientificName}</Text>
                </Text>
                <Pressable onPress={clearSelectedSpecies} hitSlop={8}>
                  <Text style={styles.undo}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.searchBox}>
                <TextInput
                  style={styles.searchInput}
                  value={speciesSearch}
                  onChangeText={setSpeciesSearch}
                  placeholder={m.plants.searchSpecies}
                  placeholderTextColor={COLORS.muted}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {searchingSpecies && (
                  <ActivityIndicator size="small" color={COLORS.muted} style={styles.searchSpinner} />
                )}
              </View>
            )}

            {speciesSuggestions.length > 0 && (
              <View style={styles.suggestions}>
                {speciesSuggestions.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => selectCatalogSpecies(s)}
                    style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}>
                    <Text style={styles.suggestionName}>
                      {s.commonNameEn ?? s.commonNameBg ?? s.scientificName}
                    </Text>
                    <Text style={styles.suggestionSci}>{s.scientificName}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* ── LAST WATERED ── */}
          <View style={styles.card}>
            <Text style={styles.label}>
              {m.plants.lastWatered}{' '}
              <Text style={styles.optional}>({m.plants.lastWateredOptional})</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={lastWatered}
              onChangeText={setLastWatered}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.muted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          {/* ── ACTIONS ── */}
          <View style={styles.btnRow}>
            <Pressable
              onPress={goBack}
              disabled={saving}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed, saving && styles.btnDisabled]}>
              <Text style={styles.cancelBtnText}>{m.common.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving}
              style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, saving && styles.btnDisabled]}>
              {saving ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.saveBtnText}>{m.common.saving}</Text>
                </View>
              ) : (
                <Text style={styles.saveBtnText}>{m.common.save}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

export default function NewPlantScreen() {
  return (
    <AuthGuard>
      <NewPlantContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  headerBack: { paddingHorizontal: 8, paddingVertical: 4 },
  headerBackText: { fontSize: 16, fontWeight: '700', color: COLORS.scarlet },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.muted,
  },
  hint: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  optional: { fontWeight: '500', textTransform: 'none', letterSpacing: 0 },
  photoArea: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.cream,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoEmoji: { fontSize: 44 },
  photoEmptyText: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.cream,
  },
  photoBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.foreground },
  identifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.greenLight,
    borderRadius: 10,
    padding: 10,
  },
  identifyText: { fontSize: 13, color: COLORS.green, fontWeight: '600' },
  identifyCard: {
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  identifyCardTitle: { fontSize: 14, color: '#15803D', lineHeight: 20 },
  identifyCardHint: { fontSize: 12, color: '#15803D' },
  bold: { fontWeight: '700' },
  sciName: { fontStyle: 'italic', fontWeight: '400' },
  identifyBtnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.green,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  rejectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    alignItems: 'center',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.green },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  confirmedText: { flex: 1, fontSize: 13, color: '#15803D' },
  undo: { fontSize: 16, color: '#15803D', fontWeight: '700' },
  notIdentified: {
    backgroundColor: COLORS.cream,
    borderRadius: 10,
    padding: 10,
  },
  notIdentifiedText: { fontSize: 13, color: COLORS.muted },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: COLORS.foreground,
    backgroundColor: COLORS.cream,
  },
  inputError: { borderColor: COLORS.scarlet },
  errorText: { fontSize: 13, color: COLORS.scarlet },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.cream,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.foreground,
  },
  searchSpinner: { marginLeft: 8 },
  suggestions: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  suggestionName: { fontSize: 14, fontWeight: '700', color: COLORS.foreground },
  suggestionSci: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic', marginTop: 1 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.muted },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.scarlet,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnDisabled: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
});
