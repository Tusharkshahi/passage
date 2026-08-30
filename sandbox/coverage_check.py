#!/usr/bin/env python3
"""
Coverage validation script — runs in the Daytona sandbox.

Reads a JSON payload from stdin, calculates waiting period eligibility
and sum-insured availability, and prints a JSON result to stdout.

Input JSON schema:
{
  "policy_start_date":   "YYYY-MM-DD",   -- required
  "patient_dob":         "YYYY-MM-DD",   -- required
  "diagnosis_code":      "K80.20",       -- required
  "estimated_cost":      74000,          -- required
  "sum_insured":         500000,         -- required (no default; omitting raises a flag)
  "prior_claims":        0,              -- optional, defaults to 0
  "pre_existing_disease": false          -- optional, defaults to false
}
"""
import json
import sys
from datetime import date, datetime

# Standard Indian insurer waiting periods (months) per IRDAI guidelines
WAITING_PERIOD_INITIAL = 1
WAITING_PERIOD_SPECIFIC_DISEASE = 24
WAITING_PERIOD_PRE_EXISTING = 48

# ICD-10 prefixes subject to specific-disease waiting period
SPECIFIC_DISEASE_ICD_PREFIXES = ("K80", "K40", "K41", "K35", "H26", "M51")


def months_between(start: date, end: date) -> int:
    """Return completed calendar months between start and end.

    Accounts for day-of-month so that a policy starting Jan 31 is not
    treated as one month old on Feb 1 — it completes its first month only
    when Feb 28/29 is reached.
    """
    months = (end.year - start.year) * 12 + (end.month - start.month)
    if end.day < start.day:
        months -= 1
    return max(months, 0)


def main() -> None:
    raw = sys.stdin.read().strip()
    if not raw:
        print(json.dumps({"error": "No input received on stdin"}))
        sys.exit(1)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid JSON: {exc}"}))
        sys.exit(1)

    # --- required fields ---
    policy_start = datetime.fromisoformat(data["policy_start_date"]).date()
    estimated_cost: int = data["estimated_cost"]
    diagnosis_code: str = data.get("diagnosis_code", "")
    today = date.today()
    months_elapsed = months_between(policy_start, today)

    flags: list[str] = []
    waiting_period_clear = True

    # --- sum_insured: required; flag rather than silently fabricate ---
    if "sum_insured" not in data:
        flags.append(
            "sum_insured not provided — within-limit check skipped. "
            "Obtain the exact sum insured from the policy document before submission."
        )
        within_limit: bool | None = None
        sum_insured_remaining: int | None = None
    else:
        sum_insured: int = data["sum_insured"]
        prior_claims: int = data.get("prior_claims", 0)
        remaining = sum_insured - prior_claims
        within_limit = estimated_cost <= remaining
        sum_insured_remaining = remaining
        if not within_limit:
            flags.append(
                f"Estimated cost \u20b9{estimated_cost:,} exceeds "
                f"remaining sum insured \u20b9{remaining:,}"
            )

    # --- initial waiting period ---
    if months_elapsed < WAITING_PERIOD_INITIAL:
        waiting_period_clear = False
        flags.append(
            f"Initial waiting period not elapsed "
            f"({months_elapsed}/{WAITING_PERIOD_INITIAL} months)"
        )

    # --- specific-disease waiting period ---
    prefix = diagnosis_code[:3]
    if any(prefix == p for p in SPECIFIC_DISEASE_ICD_PREFIXES):
        if months_elapsed < WAITING_PERIOD_SPECIFIC_DISEASE:
            waiting_period_clear = False
            flags.append(
                f"Specific-disease waiting period not elapsed "
                f"({months_elapsed}/{WAITING_PERIOD_SPECIFIC_DISEASE} months). "
                f"Applies to: gallstones (K80), hernia (K40/K41), "
                f"appendicitis (K35), cataract (H26), disc disorders (M51)."
            )

    # --- pre-existing disease waiting period (Bug #4 fix) ---
    pre_existing: bool = bool(data.get("pre_existing_disease", False))
    if pre_existing and months_elapsed < WAITING_PERIOD_PRE_EXISTING:
        waiting_period_clear = False
        flags.append(
            f"Pre-existing disease waiting period not elapsed "
            f"({months_elapsed}/{WAITING_PERIOD_PRE_EXISTING} months). "
            f"Insurer may repudiate the claim if the condition pre-dates the policy."
        )

    result = {
        "waiting_period_clear": waiting_period_clear,
        "within_limit": within_limit,
        "months_since_policy_start": months_elapsed,
        "sum_insured_remaining": sum_insured_remaining,
        "pre_existing_disease_declared": pre_existing,
        "flags": flags,
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()
