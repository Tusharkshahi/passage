import { describe, it, expect } from 'vitest';
import { lookupIcd10 } from '../src/tools/icd10.js';

describe('lookupIcd10', () => {
  it('returns a high-confidence match for "gallstones"', async () => {
    const result = await lookupIcd10('gallstones');
    expect(result.code).toBe('K80.20');
    expect(result.confidence).toBe('high');
  });

  it('returns a match for "appendicitis"', async () => {
    const result = await lookupIcd10('appendicitis');
    expect(result.code).toMatch(/^K3[567]/);
    expect(result.confidence).not.toBe('low');
  });

  it('returns a match for "diabetes"', async () => {
    const result = await lookupIcd10('diabetes');
    expect(result.code).toMatch(/^E1[01]/);
  });

  it('returns a match for "hypertension"', async () => {
    const result = await lookupIcd10('hypertension');
    expect(result.code).toBe('I10');
  });

  it('returns UNKNOWN with low confidence for an unrecognised query', async () => {
    const result = await lookupIcd10('xyzzy-unknown-condition-12345');
    expect(result.code).toBe('UNKNOWN');
    expect(result.confidence).toBe('low');
  });

  it('throws on empty input', async () => {
    await expect(lookupIcd10('')).rejects.toThrow('empty');
  });

  it('returns alternatives for close matches', async () => {
    const result = await lookupIcd10('gallstones');
    expect(Array.isArray(result.alternatives)).toBe(true);
  });
});
