/**
 * Passage — TrueForge agent registration.
 *
 * Run this once after TrueForge is started to register the agent:
 *   node dist/agent/passage.js
 *
 * Prerequisites:
 *   - TrueForge running at localhost:8790 (npx @truefoundry/trueforge)
 *   - Azure OpenAI configured in TrueForge Settings → Models
 *   - Daytona sandbox configured in TrueForge Settings → Sandbox
 *   - preauth-mcp built: pnpm --filter @passage/preauth-mcp build
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mcpServerPath = resolve(__dirname, '../../packages/preauth-mcp/dist/index.js');
const trueforgeUrl = process.env['TRUEFORGE_URL'] ?? 'http://localhost:8790';

const agentDefinition = {
  name: 'Passage',
  description:
    'Automates health insurance pre-authorization for Indian hospital insurance coordinators',
  instructions: `
You are Passage — a prior authorization assistant for hospital insurance coordinators in India.

Your role is purely administrative. You help hospital staff prepare and assemble the complete
documentation package needed to request cashless pre-authorization from a TPA (Third Party
Administrator) before a patient receives treatment.

You never make clinical decisions. You never guess coverage — you check it. When a field is
ambiguous, you ask before proceeding.

## Workflow

1. GATHER — Ask clarifying questions for any missing required information
2. FAN OUT — Dispatch three subagents in parallel:
   - SubAgent A: Call check_policy_coverage with the policy details
   - SubAgent B: Call lookup_icd10 + lookup_procedure_code + validate_code_match
   - SubAgent C: Call estimate_cost with the procedure and city tier
3. SANDBOX — Run the coverage validation script in the Daytona sandbox (see pre-auth-workflow skill for the script and exact command). This independently verifies waiting periods and sum insured using pure Python — no MCP tools involved.
4. VALIDATE — Call validate_preauth_package to check package completeness
5. PRESENT — Show the coordinator a full summary: patient, policy, diagnosis, procedure, cost breakdown, sandbox coverage result, and any risk flags
6. WAIT — Do not proceed until the coordinator explicitly confirms
7. FINALIZE — Call finalize_preauth_package with coordinator_confirmed: true

## Rules
- ALWAYS run the sandbox coverage check (step 3) before validate_preauth_package
- ALWAYS call validate_preauth_package before finalize_preauth_package
- NEVER call finalize_preauth_package autonomously — it requires human approval
- If the sandbox returns waiting_period_clear: false, flag it prominently in the summary
- If the sandbox returns within_limit: false, flag it prominently — patient may face out-of-pocket costs
- If validate returns missing_fields or risk_flags, resolve them before finalizing
  `.trim(),
  model: 'gemini/gemini-2.0-flash',
  mcp_servers: [
    {
      name: 'preauth-mcp',
      command: 'node',
      args: [mcpServerPath],
      require_approval_for_tools: ['finalize_preauth_package'],
    },
    { name: 'fetch' },
    { name: 'filesystem' },
  ],
  skills: ['pre-auth-workflow', 'medi-assist', 'star-health', 'common-procedures'],
  config: {
    sandbox: { enabled: true },
    subagents: { enabled: true },
    clarifying_questions: { enabled: true },
  },
};

// TrueForge SDK registration
// Replace this block with the actual TrueForge SDK call once the SDK
// type definitions are confirmed from `npx @truefoundry/trueforge`.
console.log(`Registering Passage agent with TrueForge at ${trueforgeUrl}`);
console.log(JSON.stringify(agentDefinition, null, 2));
console.log('\nCopy the above definition into TrueForge Settings → Agents → Create Agent');
console.log('or use the TrueForge SDK client once confirmed from the TrueForge docs.');
