import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TpaRequirements {
  required_fields: string[];
  optional_fields: string[];
  portal?: string;
}

interface TpaRequirementsMap {
  default: TpaRequirements;
  [tpa: string]: TpaRequirements;
}

export interface ValidationResult {
  valid: boolean;
  completeness_score: number;
  total_required: number;
  missing_fields: string[];
  present_fields: string[];
  risk_flags: string[];
  tpa_portal?: string;
}

function loadData(): TpaRequirementsMap {
  const raw = readFileSync(join(__dirname, '../data/tpa-requirements.json'), 'utf-8');
  return JSON.parse(raw) as TpaRequirementsMap;
}

function humanise(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function validatePreauthPackage(
  tpa: string,
  preauthData: Record<string, unknown>
): Promise<ValidationResult> {
  const data = loadData();
  const requirements: TpaRequirements = data[tpa] ?? data['default'];

  const missing: string[] = [];
  const present: string[] = [];

  for (const field of requirements.required_fields) {
    const value = preauthData[field];
    if (value === undefined || value === null || value === '') {
      missing.push(humanise(field));
    } else {
      present.push(field);
    }
  }

  const riskFlags: string[] = [];

  // Clinical consistency checks
  const diagCode = preauthData['primary_icd10_code'] as string | undefined;
  const procCode = preauthData['procedure_code'] as string | undefined;
  if (diagCode && diagCode === 'UNKNOWN') {
    riskFlags.push('Primary ICD-10 code is unresolved — enter manually before submission');
  }
  if (procCode && procCode === 'UNKNOWN') {
    riskFlags.push('Procedure code is unresolved — enter manually before submission');
  }

  const preExisting = preauthData['pre_existing_disease'];
  if (preExisting === undefined || preExisting === null) {
    riskFlags.push('Pre-existing disease field is unanswered — TPA may reject without this');
  }

  return {
    valid: missing.length === 0 && riskFlags.length === 0,
    completeness_score: present.length,
    total_required: requirements.required_fields.length,
    missing_fields: missing,
    present_fields: present,
    risk_flags: riskFlags,
    tpa_portal: requirements.portal,
  };
}
