#!/usr/bin/env python3
"""
Coverage validation script — runs in the Daytona sandbox.

Reads a JSON payload from stdin, calculates waiting period eligibility
and sum-insured availability, and prints a JSON result to stdout.

Input JSON schema:
{
  "policy_start_date": "YYYY-MM-DD",
  "patient_dob":       "YYYY-MM-DD",
  "diagnosis_code":    "K80.20",
  "estimated_cost":    74000,
  "sum_insured":       500000,
  "prior_claims":      0
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
    return (end.year - start.year) * 12 + (end.month - start.month)


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

    policy_start = datetime.fromisoformat(data["policy_start_date"]).date()
    today = date.today()
    months_elapsed = months_between(policy_start, today)

    sum_insured: int = data.get("sum_insured", 500_000)
    prior_claims: int = data.get("prior_claims", 0)
    estimated_cost: int = data["estimated_cost"]
    diagnosis_code: str = data.get("diagnosis_code", "")
    remaining = sum_insured - prior_claims

    flags: list[str] = []
    waiting_period_clear = True

    # Initial waiting period
    if months_elapsed < WAITING_PERIOD_INITIAL:
        waiting_period_clear = False
        flags.append(
            f"Initial waiting period not elapsed "
            f"({months_elapsed}/{WAITING_PERIOD_INITIAL} months)"
        )

    # Specific disease waiting period
    prefix = diagnosis_code[:3]
    if any(prefix.startswith(p) for p in SPECIFIC_DISEASE_ICD_PREFIXES):
        if months_elapsed < WAITING_PERIOD_SPECIFIC_DISEASE:
            waiting_period_clear = False
            flags.append(
                f"Specific disease waiting period not elapsed "
                f"({months_elapsed}/{WAITING_PERIOD_SPECIFIC_DISEASE} months). "
                f"Applies to: gallstones (K80), hernia (K40/K41), "
                f"appendicitis (K35), cataract (H26), disc disorders (M51)."
            )

    # Cost vs remaining sum insured
    within_limit = estimated_cost <= remaining
    if not within_limit:
        flags.append(
            f"Estimated cost ₹{estimated_cost:,} exceeds "
            f"remaining sum insured ₹{remaining:,}"
        )

    result = {
        "waiting_period_clear": waiting_period_clear,
        "within_limit": within_limit,
        "months_since_policy_start": months_elapsed,
        "sum_insured_remaining": remaining,
        "flags": flags,
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()
