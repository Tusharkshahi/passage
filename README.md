# Passage

> Health insurance pre-authorization, automated.

Passage is a TrueForge agent that automates the cashless pre-authorization process for
hospital insurance coordinators in India. A coordinator describes a patient case in plain
language; Passage gathers policy data, looks up ICD-10 codes, verifies coverage, estimates
costs, and assembles a complete pre-auth package — then waits for human approval before
finalizing it for TPA submission.

Built for the **WeMakeDevs × TrueFoundry Agent Harness Hackathon 2025**.

---

## The Problem

In India, before a patient can receive cashless treatment at a network hospital, the hospital
must get pre-authorization from the insurance company's TPA (Third Party Administrator).
Each request takes a coordinator **30–45 minutes** of manual work: filling forms, looking up
ICD-10 codes, checking waiting periods, estimating costs — across 14 different TPA portals.

In **May 2024**, IRDAI mandated:
- Pre-auth approved within **1 hour** of submission
- Insurer pays **₹5,000/day** penalty for delays
- Incomplete submissions from hospitals are the #1 cause of missed deadlines

## Setup

### Prerequisites

- Node.js 22+ (`node -v`)
- pnpm 9+ (`pnpm -v`)
- Azure OpenAI API key
- Daytona account (daytona.io)

### Install

```bash
git clone https://github.com/Tusharkshahi/passage.git
cd passage
pnpm install
pnpm build
```

### Configure

```bash
cp .env.example .env
# Then configure Azure OpenAI and Daytona in TrueForge Settings
```

### Run

```bash
# Start TrueForge
npx @truefoundry/trueforge

# In another terminal, start the MCP server
node packages/preauth-mcp/dist/index.js
```

Open TrueForge at http://localhost:8790, add `preauth-mcp` as a local MCP connector,
and start a new Passage session.

---

## Architecture

```
Hospital Coordinator (TrueForge chat)
         │
         ▼
    Passage Agent (GPT-4o via Azure)
         │
    ┌────┴────┐─────────────────────┐
    │         │                     │
SubAgent A  SubAgent B          SubAgent C
check_policy  lookup_icd10         estimate_cost
_coverage     lookup_procedure     (preauth-mcp)
(preauth-mcp) _code                     │
    │         validate_code_match   Cost breakdown
    │         (preauth-mcp)             │
    └────┬────┘─────────────────────┘
         │
  Daytona sandbox
  coverage_check.py
  (waiting period + sum insured)
         │
  validate_preauth_package
  (23-field completeness check)
         │
  ┌──────▼──────┐
  │ APPROVAL    │  ← coordinator reviews
  │    GATE     │
  └──────┬──────┘
         │ approved
  finalize_preauth_package
  (submission-ready package)
```

---

## MCP Server Tools

| Tool | Description | Gated |
|------|-------------|-------|
| `lookup_icd10` | ICD-10 code lookup by plain-language diagnosis | No |
| `lookup_procedure_code` | Procedure code lookup + code-match validation | No |
| `validate_code_match` | Checks a diagnosis/procedure pair is clinically consistent | No |
| `check_policy_coverage` | Waiting periods, sub-limits, sum insured | No |
| `estimate_cost` | Itemised cost by procedure, city, hospital tier | No |
| `validate_preauth_package` | 23-field completeness check | No |
| `finalize_preauth_package` | Locks package for TPA submission | **Yes** |

---

## Demo

Try this prompt in the Passage TrueForge session:

> *"New admission. Patient Priya Sharma, 45F. Star Health policy SH-2847629. Gallstones,
> needs laparoscopic cholecystectomy. Doctor: Dr. Ramesh Nair, MBBS MS General Surgery,
> MH-45892. Hospital: Apollo Hospital, Mumbai. Estimated stay: 2 days. Policy started
> January 2022. Sum insured 5 lakh."*

See `demo/case-1-cholecystectomy.json` for the full case with expected outputs.

---

## Development

```bash
pnpm test          # Run all tests (25 tests)
pnpm typecheck     # TypeScript type check
pnpm lint          # ESLint v10
pnpm build         # Compile TypeScript
```

See [AGENTS.md](AGENTS.md) for the full developer reference.

---

## Qodo Code Review Evidence

*(PR links added here as branches are merged)*

---

## Disclaimer

Passage is an administrative tool. It assists hospital staff in preparing pre-authorization
documentation. It does not provide medical advice, clinical decisions, or insurance coverage
guarantees. All packages must be reviewed by authorized hospital staff before submission.

---

MIT License © 2025 Tushar Kumar Shahi
