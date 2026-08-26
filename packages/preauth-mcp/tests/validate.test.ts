import { describe, it, expect } from 'vitest';
import { validatePreauthPackage } from '../src/tools/validate.js';

const COMPLETE_PACKAGE = {
  patient_name: 'Priya Sharma',
  patient_dob: '1979-03-15',
  patient_gender: 'Female',
  patient_contact: '9876543210',
  patient_email: 'priya@example.com',
  policy_number: 'SH-2847629',
  insurer_name: 'Star Health',
  tpa_name: 'Medi Assist',
  hospital_name: 'Apollo Hospital',
  hospital_city: 'Mumbai',
  hospital_email: 'insurance@apollo.com',
  doctor_name: 'Dr. Ramesh Nair',
  doctor_qualification: 'MBBS MS General Surgery',
  doctor_registration_number: 'MH-45892',
  primary_diagnosis: 'Calculus of gallbladder',
  primary_icd10_code: 'K80.20',
  proposed_procedure: 'Laparoscopic cholecystectomy',
  procedure_icd10_pcs_code: '0FB44ZZ',
  expected_stay_days: 2,
  cost_room: 8000,
  cost_surgeon: 35000,
  cost_anesthesia: 8000,
  cost_ot: 12000,
  cost_investigations: 6000,
  cost_pharmacy: 5000,
  pre_existing_disease: false,
  alcohol_drug_related: false,
};

describe('validatePreauthPackage', () => {
  it('returns valid for a complete package', async () => {
    const result = await validatePreauthPackage('Medi Assist', COMPLETE_PACKAGE);
    expect(result.valid).toBe(true);
    expect(result.missing_fields).toHaveLength(0);
  });

  it('flags missing required fields', async () => {
    const { patient_name: _n, primary_icd10_code: _c, ...incomplete } = COMPLETE_PACKAGE;
    const result = await validatePreauthPackage('Medi Assist', incomplete);
    expect(result.valid).toBe(false);
    expect(result.missing_fields.length).toBeGreaterThan(0);
  });

  it('flags UNKNOWN ICD-10 code as a risk', async () => {
    const withUnknown = { ...COMPLETE_PACKAGE, primary_icd10_code: 'UNKNOWN' };
    const result = await validatePreauthPackage('Medi Assist', withUnknown);
    expect(result.risk_flags.some((f) => f.includes('ICD-10'))).toBe(true);
  });

  it('returns completeness score', async () => {
    const result = await validatePreauthPackage('Medi Assist', COMPLETE_PACKAGE);
    expect(result.completeness_score).toBeGreaterThan(0);
    expect(result.total_required).toBeGreaterThan(0);
  });

  it('falls back to default requirements for unknown TPA', async () => {
    const result = await validatePreauthPackage('Unknown TPA XYZ', COMPLETE_PACKAGE);
    expect(result.total_required).toBeGreaterThan(0);
  });
});
