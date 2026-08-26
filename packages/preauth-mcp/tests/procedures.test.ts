import { describe, it, expect } from 'vitest';
import { lookupProcedureCode, validateCodeMatch } from '../src/tools/procedures.js';

describe('lookupProcedureCode', () => {
  it('returns correct code for laparoscopic cholecystectomy', async () => {
    const result = await lookupProcedureCode('laparoscopic cholecystectomy');
    expect(result.code).toBe('0FB44ZZ');
    expect(result.confidence).toBe('high');
  });

  it('returns correct code for knee replacement', async () => {
    const result = await lookupProcedureCode('knee replacement');
    expect(result.code).toBe('0SRC0Z9');
  });

  it('returns correct code for appendectomy', async () => {
    const result = await lookupProcedureCode('appendectomy');
    expect(result.code).toBe('0DTJ0ZZ');
  });

  it('returns UNKNOWN for unrecognised procedure', async () => {
    const result = await lookupProcedureCode('xyz-procedure-not-in-db');
    expect(result.code).toBe('UNKNOWN');
    expect(result.confidence).toBe('low');
  });

  it('throws on empty input', async () => {
    await expect(lookupProcedureCode('')).rejects.toThrow('empty');
  });
});

describe('validateCodeMatch', () => {
  it('validates a correct diagnosis-procedure pair', async () => {
    const result = await validateCodeMatch('K80.20', '0FB44ZZ');
    expect(result.valid).toBe(true);
    expect(result.confidence).toBe('high');
  });

  it('flags an incorrect diagnosis-procedure pair', async () => {
    // Gallstone diagnosis + knee replacement = invalid
    const result = await validateCodeMatch('K80.20', '0SRC0Z9');
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('returns low confidence for unknown procedure code', async () => {
    const result = await validateCodeMatch('K80.20', 'UNKNOWN-CODE');
    expect(result.valid).toBe(false);
    expect(result.confidence).toBe('low');
  });
});
