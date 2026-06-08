import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { ScanImage } from '@/lib/api';

// Re-encode the picked photo to a downscaled JPEG. This mirrors the web's
// client-side downscale: it guarantees a backend-supported format (iOS gallery
// photos can be HEIC) and keeps the upload under the 5 MB limit.
async function normalize(asset: ImagePicker.ImagePickerAsset): Promise<ScanImage> {
  const actions =
    asset.width && asset.width > 1280 ? [{ resize: { width: 1280 } as const }] : [];
  const result = await manipulateAsync(asset.uri, actions, {
    compress: 0.7,
    format: SaveFormat.JPEG,
  });
  return { uri: result.uri, name: 'scan.jpg', mimeType: 'image/jpeg' };
}

export class PermissionDeniedError extends Error {
  constructor() {
    super('permission-denied');
    this.name = 'PermissionDeniedError';
  }
}

// Picks (library) or captures (camera) a photo and returns it ready to upload.
// Returns null if the user cancels. Throws PermissionDeniedError if access is
// refused so the caller can show a friendly message.
export async function pickScanImage(source: 'camera' | 'library'): Promise<ScanImage | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new PermissionDeniedError();

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return null;
  return normalize(result.assets[0]);
}
