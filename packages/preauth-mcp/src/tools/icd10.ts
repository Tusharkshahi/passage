import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Icd10Entry {
  code: string;
  description: string;
  keywords: string[];
}

export interface Icd10Result {
  code: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  alternatives: Array<{ code: string; description: string }>;
}

function loadData(): Icd10Entry[] {
  const raw = readFileSync(join(__dirname, '../data/icd10-common.json'), 'utf-8');
  return JSON.parse(raw) as Icd10Entry[];
}

/**
 * Simple scoring: counts keyword matches (substring, case-insensitive).
 * Returns a score from 0 to N.
 */
function score(entry: Icd10Entry, query: string): number {
  const q = query.toLowerCase();
  let s = 0;

  for (const kw of entry.keywords) {
    if (q.includes(kw.toLowerCase()) || kw.toLowerCase().includes(q)) s += 2;
  }
  if (entry.description.toLowerCase().includes(q)) s += 1;

  return s;
}

export async function lookupIcd10(diagnosis: string): Promise<Icd10Result> {
  if (!diagnosis || diagnosis.trim().length === 0) {
    throw new Error('Diagnosis query cannot be empty');
  }

  const data = loadData();
  const query = diagnosis.trim();

  const scored = data
    .map((entry) => ({ entry, score: score(entry, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      code: 'UNKNOWN',
      description: `No ICD-10 match found for: "${diagnosis}". Please specify the diagnosis more precisely or enter the code manually.`,
      confidence: 'low',
      alternatives: [],
    };
  }

  const best = scored[0]!;
  const confidence: 'high' | 'medium' | 'low' =
    best.score >= 2 ? 'high' : best.score >= 1 ? 'medium' : 'low';

  return {
    code: best.entry.code,
    description: best.entry.description,
    confidence,
    alternatives: scored
      .slice(1, 4)
      .map((r) => ({ code: r.entry.code, description: r.entry.description })),
  };
}
