import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ProcedureEntry {
  code: string;
  description: string;
  common_name: string;
  keywords: string[];
  compatible_diagnoses: string[];
}

export interface ProcedureResult {
  code: string;
  description: string;
  common_name: string;
  confidence: 'high' | 'medium' | 'low';
  alternatives: Array<{ code: string; common_name: string }>;
}

export interface CodeMatchResult {
  valid: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

function loadData(): ProcedureEntry[] {
  const raw = readFileSync(join(__dirname, '../data/procedure-codes.json'), 'utf-8');
  return JSON.parse(raw) as ProcedureEntry[];
}

function score(entry: ProcedureEntry, query: string): number {
  const q = query.toLowerCase();
  let s = 0;
  for (const kw of entry.keywords) {
    if (q.includes(kw.toLowerCase()) || kw.toLowerCase().includes(q)) s += 2;
  }
  if (entry.common_name.toLowerCase().includes(q)) s += 1;
  return s;
}

export async function lookupProcedureCode(procedure: string): Promise<ProcedureResult> {
  if (!procedure || procedure.trim().length === 0) {
    throw new Error('Procedure query cannot be empty');
  }

  const data = loadData();
  const query = procedure.trim();

  const scored = data
    .map((entry) => ({ entry, score: score(entry, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      code: 'UNKNOWN',
      description: `No procedure code match found for: "${procedure}". Please enter the ICD-10 PCS code manually.`,
      common_name: procedure,
      confidence: 'low',
      alternatives: [],
    };
  }

  const best = scored[0]!;
  const confidence: 'high' | 'medium' | 'low' =
    best.score >= 4 ? 'high' : best.score >= 2 ? 'medium' : 'low';

  return {
    code: best.entry.code,
    description: best.entry.description,
    common_name: best.entry.common_name,
    confidence,
    alternatives: scored
      .slice(1, 3)
      .map((r) => ({ code: r.entry.code, common_name: r.entry.common_name })),
  };
}

export async function validateCodeMatch(
  diagnosisCode: string,
  procedureCode: string
): Promise<CodeMatchResult> {
  const data = loadData();
  const procedure = data.find((p) => p.code === procedureCode);

  if (!procedure) {
    return {
      valid: false,
      confidence: 'low',
      reason: `Procedure code ${procedureCode} not found in reference data`,
    };
  }

  const diagnosisPrefix = diagnosisCode.slice(0, 3);
  const isCompatible = procedure.compatible_diagnoses.some(
    (d) => diagnosisPrefix.startsWith(d) || d.startsWith(diagnosisPrefix)
  );

  if (isCompatible) {
    return { valid: true, confidence: 'high' };
  }

  return {
    valid: false,
    confidence: 'medium',
    reason: `Procedure "${procedure.common_name}" (${procedureCode}) is not typically associated with diagnosis code ${diagnosisCode}. Verify with the treating doctor.`,
  };
}
