import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/context/auth';
import { ApiError, createPlant, uploadPlantImage } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { ScanImage } from '@/lib/api';

interface Props {
  visible: boolean;
  /** Pre-filled name (e.g. from an AI scan result). */
  initialName?: string;
  /** Pre-filled species ID to link when the AI matched a catalog entry. */
  initialSpeciesId?: string | null;
  /** Photo from a scan — uploaded automatically after the plant is created. */
  image?: ScanImage | null;
  onClose: () => void;
  /** Called with the new plant id once saved, so the caller can navigate/refresh. */
  onSaved: (plantId: string) => void;
}

const COLORS = {
  scarlet: '#C2375A',
  scarletLight: '#FCEEF3',
  surface: '#FFFFFF',
  foreground: '#1A0D12',
  muted: '#7A6070',
  border: '#EDD8E2',
  cream: '#FBF5F8',
  green: '#16A34A',
  overlay: 'rgba(0,0,0,0.45)',
};

export function AddPlantModal({
  visible,
  initialName = '',
  initialSpeciesId,
  image,
  onClose,
  onSaved,
}: Props) {
  const { m } = useI18n();
  const router = useRouter();
  const { authedRequest } = useAuth();

  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  // Sync pre-filled name when the modal re-opens with a different scan result.
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError(null);
      setSavedId(null);
      setSaving(false);
      setUploadingPhoto(false);
    }
  }, [visible, initialName]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name for your plant.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const plant = await authedRequest((token) =>
        createPlant({ customName: trimmed, speciesId: initialSpeciesId ?? null }, token)
      );

      // Upload the scan image as the plant's cover photo if provided.
      if (image) {
        setUploadingPhoto(true);
        try {
          await authedRequest((token) => uploadPlantImage(plant.id, image, token));
        } catch {
          // Non-fatal — the plant is already created; the photo just won't be set.
        } finally {
          setUploadingPhoto(false);
        }
      }

      setSavedId(plant.id);
      onSaved(plant.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : m.plants.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || uploadingPhoto;
  const statusLabel = uploadingPhoto ? m.plants.uploadingPhoto : m.common.saving;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onClose} />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{m.plants.addPlant}</Text>
            {!busy && (
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Scan preview */}
          {image && (
            <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
          )}

          {/* Name field */}
          <Text style={styles.label}>Name</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={name}
            onChangeText={(v) => { setName(v); setError(null); }}
            placeholder={m.plants.namePlaceholder}
            placeholderTextColor={COLORS.muted}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={save}
            editable={!busy}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Actions */}
          {savedId ? (
            <View style={styles.successRow}>
              <Text style={styles.successText}>✓ {m.plants.addPlant}</Text>
              <Pressable
                onPress={() => { onClose(); router.push(`/plants/${savedId}`); }}
                style={({ pressed }) => [styles.viewBtn, pressed && styles.pressed]}>
                <Text style={styles.viewBtnText}>{m.plants.viewPlant}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <Pressable
                onPress={onClose}
                disabled={busy}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed, busy && styles.btnDisabled]}>
                <Text style={styles.cancelBtnText}>{m.common.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={busy}
                style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, busy && styles.btnDisabled]}>
                {busy ? (
                  <View style={styles.savingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.saveBtnText}>{statusLabel}</Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>{m.common.save}</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 14,
    // Cap width and center on tablets / web while staying full-width on phones.
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    backgroundColor: COLORS.cream,
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
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: COLORS.foreground,
    backgroundColor: COLORS.cream,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.scarlet,
    backgroundColor: COLORS.scarletLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.muted,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.scarlet,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  successText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.green,
  },
  viewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.green,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  pressed: {
    opacity: 0.8,
  },
});
