export interface CoverageInput {
  policy_number: string;
  insurer: string;
  diagnosis_code: string;
  procedure_code: string;
  estimated_cost: number;
  patient_dob: string;
  policy_start_date: string;
  sum_insured?: number;
  prior_claims?: number;
}

export interface CoverageResult {
  waiting_period_clear: boolean;
  within_limit: boolean;
  months_since_policy_start: number;
  sum_insured_remaining: number;
  flags: string[];
  sandbox_script: string;
}

/**
 * Standard waiting periods (months) per IRDAI guidelines.
 * The actual waiting period check is run in the Daytona sandbox
 * via coverage_check.py. This function assembles the input and
 * returns the sandbox script path + a local pre-check.
 */
const SPECIFIC_DISEASE_ICD_PREFIXES = ['K80', 'K40', 'K41', 'H26', 'K35', 'M51'];
const WAITING_PERIOD_SPECIFIC_DISEASE_MONTHS = 24;
const WAITING_PERIOD_INITIAL_MONTHS = 1;

export async function checkPolicyCoverage(input: CoverageInput): Promise<CoverageResult> {
  const {
    diagnosis_code,
    estimated_cost,
    policy_start_date,
    sum_insured = 500000,
    prior_claims = 0,
  } = input;

  const policyStart = new Date(policy_start_date);
  const today = new Date();
  const monthsElapsed =
    (today.getFullYear() - policyStart.getFullYear()) * 12 +
    (today.getMonth() - policyStart.getMonth());

  const remaining = sum_insured - prior_claims;
  const flags: string[] = [];
  let waitingPeriodClear = true;

  if (monthsElapsed < WAITING_PERIOD_INITIAL_MONTHS) {
    waitingPeriodClear = false;
    flags.push(
      `Initial waiting period not elapsed (${monthsElapsed}/${WAITING_PERIOD_INITIAL_MONTHS} months)`
    );
  }

  const diagnosisPrefix = diagnosis_code.slice(0, 3);
  if (
    SPECIFIC_DISEASE_ICD_PREFIXES.includes(diagnosisPrefix) &&
    monthsElapsed < WAITING_PERIOD_SPECIFIC_DISEASE_MONTHS
  ) {
    waitingPeriodClear = false;
    flags.push(
      `Specific disease waiting period not elapsed (${monthsElapsed}/${WAITING_PERIOD_SPECIFIC_DISEASE_MONTHS} months). This applies to: gallstones, hernia, cataract, appendicitis, and disc disorders.`
    );
  }

  if (estimated_cost > remaining) {
    flags.push(
      `Estimated cost ₹${estimated_cost.toLocaleString('en-IN')} exceeds remaining sum insured ₹${remaining.toLocaleString('en-IN')}`
    );
  }

  return {
    waiting_period_clear: waitingPeriodClear,
    within_limit: estimated_cost <= remaining,
    months_since_policy_start: monthsElapsed,
    sum_insured_remaining: remaining,
    flags,
    sandbox_script: 'sandbox/coverage_check.py',
  };
}
