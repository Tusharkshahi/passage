import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface CostEntry {
  surgeon: number;
  anesthesia: number;
  ot: number;
  room_per_day: number;
  investigations: number;
  pharmacy: number;
  consumables: number;
}

interface ProcedureCost {
  name: string;
  stay_days_typical: number;
  costs: { A: CostEntry; B: CostEntry; C: CostEntry };
}

interface CostBenchmarks {
  tier_cities: { A: string[]; B: string[]; C: string[] };
  procedures: Record<string, ProcedureCost>;
}

export interface CostInput {
  procedure_code: string;
  city: string;
  hospital_tier: 'A' | 'B' | 'C';
  stay_days?: number;
}

export interface CostResult {
  procedure_name: string;
  tier: 'A' | 'B' | 'C';
  stay_days: number;
  breakdown: {
    room: number;
    surgeon: number;
    anesthesia: number;
    ot: number;
    investigations: number;
    pharmacy: number;
    consumables: number;
  };
  total: number;
  note: string;
}

function loadData(): CostBenchmarks {
  const raw = readFileSync(join(__dirname, '../data/cost-benchmarks.json'), 'utf-8');
  return JSON.parse(raw) as CostBenchmarks;
}

function getTier(city: string, data: CostBenchmarks): 'A' | 'B' | 'C' {
  const normalised = city.trim().toLowerCase();
  if (data.tier_cities.A.some((c) => c.toLowerCase() === normalised)) return 'A';
  if (data.tier_cities.B.some((c) => c.toLowerCase() === normalised)) return 'B';
  return 'C';
}

export async function estimateCost(input: CostInput): Promise<CostResult> {
  const data = loadData();

  const tier: 'A' | 'B' | 'C' = input.hospital_tier ?? getTier(input.city, data);

  const procedure: ProcedureCost =
    data.procedures[input.procedure_code] ?? data.procedures['default']!;

  const stay = input.stay_days ?? procedure.stay_days_typical;
  const costs = procedure.costs[tier];

  const room = costs.room_per_day * stay;
  const total =
    room +
    costs.surgeon +
    costs.anesthesia +
    costs.ot +
    costs.investigations +
    costs.pharmacy +
    costs.consumables;

  return {
    procedure_name: procedure.name,
    tier,
    stay_days: stay,
    breakdown: {
      room,
      surgeon: costs.surgeon,
      anesthesia: costs.anesthesia,
      ot: costs.ot,
      investigations: costs.investigations,
      pharmacy: costs.pharmacy,
      consumables: costs.consumables,
    },
    total,
    note: 'Estimate based on benchmark data. Actual costs may vary by hospital. Use for pre-auth planning only.',
  };
}
