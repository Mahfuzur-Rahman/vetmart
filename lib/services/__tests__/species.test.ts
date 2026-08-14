// lib/services/__tests__/species.test.ts
import { describe, it, expect } from 'vitest';
import { SPECIES, getSpeciesName, getSpeciesBySlug, speciesSlugToKey } from '../species';

describe('Species Navigation Service (§2 rule 1, §7)', () => {
  it('defines exactly 8 target species', () => {
    expect(SPECIES).toHaveLength(8);
    const keys = SPECIES.map((s) => s.key);
    expect(keys).toContain('cattle');
    expect(keys).toContain('buffalo');
    expect(keys).toContain('goat_sheep');
    expect(keys).toContain('poultry');
    expect(keys).toContain('fish');
    expect(keys).toContain('dog');
    expect(keys).toContain('cat');
    expect(keys).toContain('pigeon');
  });

  it('returns Bangla species name for bn locale', () => {
    expect(getSpeciesName('cattle', 'bn')).toBe('গরু');
    expect(getSpeciesName('poultry', 'bn')).toBe('পোল্ট্রি');
    expect(getSpeciesName('goat_sheep', 'bn')).toBe('ছাগল ও ভেড়া');
  });

  it('returns English species name for en locale', () => {
    expect(getSpeciesName('cattle', 'en')).toBe('Cattle');
    expect(getSpeciesName('poultry', 'en')).toBe('Poultry');
  });

  it('falls back to key for unknown species', () => {
    expect(getSpeciesName('unicorn', 'bn')).toBe('unicorn');
  });

  it('resolves species by URL slug', () => {
    const gs = getSpeciesBySlug('goat-sheep');
    expect(gs).toBeDefined();
    expect(gs!.key).toBe('goat_sheep');
    expect(gs!.nameBn).toBe('ছাগল ও ভেড়া');
  });

  it('converts URL slug to database key', () => {
    expect(speciesSlugToKey('goat-sheep')).toBe('goat_sheep');
    expect(speciesSlugToKey('cattle')).toBe('cattle');
    expect(speciesSlugToKey('nonexistent')).toBeNull();
  });
});
