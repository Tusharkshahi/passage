# Security Policy

## Data Handling

Passage is an administrative automation tool. The public repository contains
**synthetic demo data only**. No real patient data, policy numbers, medical
records, or personally identifiable information (PHI/PII) is present.

## Disclaimer

Passage assists hospital staff in preparing pre-authorization documentation.
It does not provide medical advice, clinical decisions, or insurance coverage
guarantees. All packages must be reviewed by authorized hospital staff before
submission. This tool is intended for administrative use only.

## Reporting a Vulnerability

If you discover a security vulnerability, please open a GitHub issue marked
`[SECURITY]`. Do not disclose publicly until a fix is available. For sensitive
reports, contact the maintainer directly via GitHub.

## Secrets Management

- API keys are configured in TrueForge Settings (connector system), never in code
- `.env` is in `.gitignore` — only `.env.example` (no real values) is committed
- Pre-commit hooks run `lint-staged` to catch accidental credential commits
