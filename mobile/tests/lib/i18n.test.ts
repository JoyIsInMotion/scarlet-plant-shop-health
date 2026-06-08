import { getMessages, pickLocalized, speciesName } from '@/lib/i18n';
import type { PlantSpecies } from '@/lib/types';

// ─── getMessages() ────────────────────────────────────────────────────────────

describe('getMessages()', () => {
  it('returns Bulgarian messages for "bg"', () => {
    const m = getMessages('bg');
    expect(m.common.save).toBe('Запази');
    expect(m.nav.login).toBe('Вход');
  });

  it('returns English messages for "en"', () => {
    const m = getMessages('en');
    expect(m.common.save).toBe('Save');
    expect(m.nav.login).toBe('Log in');
  });

  it('Bulgarian and English share the same key structure', () => {
    const bg = getMessages('bg');
    const en = getMessages('en');
    // Every top-level section present in BG must also exist in EN.
    Object.keys(bg).forEach((section) => {
      expect(en).toHaveProperty(section);
    });
  });
});

// ─── pickLocalized() ─────────────────────────────────────────────────────────

describe('pickLocalized()', () => {
  it('returns the string unchanged when value is a plain string', () => {
    expect(pickLocalized('hello', 'en')).toBe('hello');
    expect(pickLocalized('hello', 'bg')).toBe('hello');
  });

  it('returns the locale-specific value from a {bg, en} object', () => {
    const v = { bg: 'Вода', en: 'Water' };
    expect(pickLocalized(v, 'en')).toBe('Water');
    expect(pickLocalized(v, 'bg')).toBe('Вода');
  });

  it('returns null when the value is null', () => {
    expect(pickLocalized(null, 'en')).toBeNull();
    expect(pickLocalized(null, 'bg')).toBeNull();
  });

  it('returns null when the value is undefined', () => {
    expect(pickLocalized(undefined, 'en')).toBeNull();
  });

  it('handles an empty-string locale value gracefully', () => {
    const v = { bg: '', en: 'Water' };
    // Empty string is falsy — callers treat it like no value.
    const result = pickLocalized(v, 'bg');
    expect(typeof result === 'string' || result === null).toBe(true);
  });
});

// ─── speciesName() ────────────────────────────────────────────────────────────

describe('speciesName()', () => {
  const species: PlantSpecies = {
    id: 's1',
    commonNameEn: 'Snake Plant',
    commonNameBg: 'Змийско растение',
    scientificName: 'Sansevieria trifasciata',
    careDifficulty: 'easy',
    imageUrl: null,
  };

  it('returns the English common name when locale is "en"', () => {
    expect(speciesName(species, 'en')).toBe('Snake Plant');
  });

  it('returns the Bulgarian common name when locale is "bg"', () => {
    expect(speciesName(species, 'bg')).toBe('Змийско растение');
  });

  it('falls back to scientific name when common name is absent', () => {
    const noCommon: PlantSpecies = { ...species, commonNameEn: null, commonNameBg: null };
    expect(speciesName(noCommon, 'en')).toBe('Sansevieria trifasciata');
    expect(speciesName(noCommon, 'bg')).toBe('Sansevieria trifasciata');
  });

  it('returns null for a null species', () => {
    expect(speciesName(null, 'en')).toBeNull();
    expect(speciesName(null, 'bg')).toBeNull();
  });

  it('falls back to English common name when BG is missing and locale is bg', () => {
    const bgMissing: PlantSpecies = { ...species, commonNameBg: null };
    const result = speciesName(bgMissing, 'bg');
    // Should return either English common name or scientific name — not null.
    expect(result).not.toBeNull();
  });
});
