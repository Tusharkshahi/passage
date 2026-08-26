# Passage — Agent & Developer Reference

AI agent for automating health insurance pre-authorization (cashless hospitalization)
in the Indian healthcare system. Built on TrueForge for the WeMakeDevs × TrueFoundry
Agent Harness Hackathon 2025.

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Build the MCP server
pnpm build

# Run all tests
pnpm test

# Run tests in watch mode
cd packages/preauth-mcp && pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint

# Start TrueForge (runs on localhost:8790)
npx @truefoundry/trueforge

# Register the Passage agent
node src/agent/passage.js
```

---

## Project Structure

```
passage/
├── packages/preauth-mcp/   # Custom MCP server — 6 tools for pre-auth automation
├── src/agent/              # TrueForge agent registration
├── skills/                 # Agent skill files (loaded on demand by TrueForge)
├── sandbox/                # Python scripts that run in Daytona sandbox
├── demo/                   # Synthetic patient cases for demo (NO real PHI)
└── docs/                   # Architecture diagrams, demo script
```

---

## Environment Setup

Copy `.env.example` to `.env`. Keys go in TrueForge Settings — never in `.env`.

```bash
cp .env.example .env
```

Configure in TrueForge UI:
- **Models**: Settings → Models → Add Azure OpenAI provider
- **Sandbox**: Settings → Sandbox → Add Daytona provider (API key from daytona.io)

---

## MCP Server Tools (packages/preauth-mcp)

| Tool | Description | Gated? |
|------|-------------|--------|
| `lookup_icd10` | ICD-10 code lookup by plain-language diagnosis | No |
| `lookup_procedure_code` | Procedure code lookup + code-match validation | No |
| `check_policy_coverage` | Waiting periods, sub-limits, sum insured check | No |
| `estimate_cost` | Cost estimation by procedure, city, hospital tier | No |
| `validate_preauth_package` | Completeness check before submission | No |
| `finalize_preauth_package` | Locks package for TPA submission (irreversible) | **Yes** |

---

## Running the MCP Server Standalone

```bash
cd packages/preauth-mcp
pnpm build
node dist/index.js
# Server listens on stdio — connect via TrueForge local connector
```

---

## Testing

```bash
# All tests
pnpm test

# Single package
pnpm --filter @passage/preauth-mcp test --run

# With coverage
cd packages/preauth-mcp && pnpm test --coverage
```

---

## Commit Convention

Uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(preauth-mcp): add ICD-10 lookup with fuzzy matching
fix(coverage): read input from stdin instead of argv
docs(readme): add IRDAI context
chore: add ESLint v9 flat config
test(icd10): add unit tests for fuzzy matching
```

---

## Key External Context

- **IRDAI Master Circular (May 2024)**: Mandates pre-auth within 1 hour
- **TPA partners**: Medi Assist, Raksha TPA, MDIndia, Paramount, FHPL
- **Target users**: Hospital insurance desk coordinators
- **Data**: All demo data is synthetic — no real PHI anywhere in this repo
