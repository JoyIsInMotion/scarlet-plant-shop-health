import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/utils/slugify';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Red Rose Bouquet')).toBe('red-rose-bouquet');
  });
  it('strips punctuation', () => {
    expect(slugify('Monstera (Deliciosa)!')).toBe('monstera-deliciosa');
  });
  it('collapses whitespace and underscores', () => {
    expect(slugify('a   b__c')).toBe('a-b-c');
  });
  it('trims leading/trailing separators', () => {
    expect(slugify('  -Hello-  ')).toBe('hello');
  });
});
