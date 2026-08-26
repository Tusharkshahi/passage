import { describe, it, expect } from 'vitest';
import { checkPolicyCoverage } from '../src/tools/coverage.js';

const BASE_INPUT = {
  policy_number: 'SH-TEST-001',
  insurer: 'Star Health',
  diagnosis_code: 'K80.20',
  procedure_code: '0FB44ZZ',
  estimated_cost: 74000,
  patient_dob: '1979-03-15',
  policy_start_date: '2022-01-01', // 3+ years ago → waiting periods clear
  sum_insured: 500000,
  prior_claims: 0,
};

describe('checkPolicyCoverage', () => {
  it('returns clear for a policy with elapsed waiting period', async () => {
    const result = await checkPolicyCoverage(BASE_INPUT);
    expect(result.waiting_period_clear).toBe(true);
    expect(result.flags).toHaveLength(0);
    expect(result.within_limit).toBe(true);
  });

  it('flags when specific disease waiting period not elapsed', async () => {
    const recent = {
      ...BASE_INPUT,
      policy_start_date: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10), // ~6 months ago
    };
    const result = await checkPolicyCoverage(recent);
    expect(result.waiting_period_clear).toBe(false);
    expect(result.flags.length).toBeGreaterThan(0);
  });

  it('flags when estimated cost exceeds remaining sum insured', async () => {
    const overLimit = {
      ...BASE_INPUT,
      estimated_cost: 600000, // exceeds 500000 sum insured
    };
    const result = await checkPolicyCoverage(overLimit);
    expect(result.within_limit).toBe(false);
    expect(result.flags.some((f) => f.includes('exceeds'))).toBe(true);
  });

  it('correctly calculates remaining sum insured after prior claims', async () => {
    const withPrior = { ...BASE_INPUT, prior_claims: 100000 };
    const result = await checkPolicyCoverage(withPrior);
    expect(result.sum_insured_remaining).toBe(400000);
  });

  it('returns sandbox script path', async () => {
    const result = await checkPolicyCoverage(BASE_INPUT);
    expect(result.sandbox_script).toBe('sandbox/coverage_check.py');
  });
});
