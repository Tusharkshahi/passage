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

Passage handles the 30-minute assembly in under 2 minutes.

---

## Architecture

```
Hospital Coordinator (TrueForge chat)
         │
         ▼
    Passage Agent (LLM via TrueForge)
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
  (waiting period + sum insured — isolated Python)
         │
  validate_preauth_package
  (23-field completeness check)
         │
  ┌──────▼──────┐
  │  APPROVAL   │  ← coordinator reviews
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
| `finalize_preauth_package` | Locks package for TPA submission | **Yes — human approval required** |

---

## Setup

### Prerequisites

- Node.js 22+ and pnpm 9+
- A TrueForge-supported model API key (OpenAI, Gemini, Anthropic, or Azure OpenAI)
- Daytona account ([daytona.io](https://daytona.io)) for sandbox execution

### Install

```bash
git clone https://github.com/Tusharkshahi/passage.git
cd passage
pnpm install
pnpm build
```

### Run

**Terminal 1 — TrueForge:**
```bash
npx @truefoundry/trueforge
```
Open http://localhost:8790

**Terminal 2 — preauth-mcp in HTTP/SSE mode:**
```bash
node packages/preauth-mcp/dist/index.js --http --port 3001
```

### Configure TrueForge

1. **Settings → Models** → Add your model provider (Gemini, OpenAI, etc.)
2. **Settings → Connectors → Add MCP Server**
   - URL: `http://localhost:3001/sse`
   - Name: `preauth-mcp`, Auth: None
3. **Settings → Sandbox providers** → Add Daytona with your API key
4. **New Agent** → paste instructions from `src/agent/passage.ts`, attach `preauth-mcp`, enable Sandbox + Sub-agents

---

## Demo

Paste this into a Passage chat session:

> *"New admission. Patient Priya Sharma, 45F. Star Health policy SH-2847629. Gallstones,
> needs laparoscopic cholecystectomy. Doctor: Dr. Ramesh Nair, MBBS MS General Surgery,
> MH-45892. Hospital: Apollo Hospital, Mumbai. Estimated stay: 2 days. Policy started
> January 2022. Sum insured 5 lakh."*

What happens:
1. Agent asks any missing clarifying questions
2. Three subagents fan out in parallel (coverage check, ICD-10 coding, cost estimation)
3. Daytona sandbox runs `coverage_check.py` — verifies waiting periods and sum insured
4. `validate_preauth_package` confirms all 23 fields are present
5. Coordinator reviews the full summary
6. On confirmation, `finalize_preauth_package` fires — **approval gate visible in Agent Steps**

See `demo/case-1-cholecystectomy.json` and `demo/case-2-cardiac-emergency.json` for full test cases.

---

## Development

```bash
pnpm test           # Run all unit tests (25 tests across 4 files)
pnpm typecheck      # TypeScript type check (root + preauth-mcp)
pnpm lint           # ESLint v10 across workspace
pnpm build          # Compile TypeScript
```

See [AGENTS.md](AGENTS.md) for the full developer and agent reference.

---

## Skills

| Skill | Purpose |
|-------|---------|
| `pre-auth-workflow` | Full workflow SOP + sandbox coverage script |
| `tpa/medi-assist` | Medi Assist specific fields and rejection reasons |
| `tpa/star-health` | Star Health specific fields and rejection reasons |
| `tpa/raksha-tpa` | Raksha TPA specific fields, ROHINI ID, implant sub-process |
| `clinical/common-procedures` | Common surgical procedures with typical costs and ICD-10 codes |

---

## Qodo Code Review Evidence

| PR | Description | Qodo Review |
|----|-------------|-------------|
| *(links added as PRs are opened and reviewed)* | | |

---

## Disclaimer

Passage is an administrative tool. It assists hospital staff in preparing pre-authorization
documentation. It does not provide medical advice, clinical decisions, or insurance coverage
guarantees. All packages must be reviewed by authorized hospital staff before submission.

---

MIT License © 2025 Tushar Kumar Shahi
