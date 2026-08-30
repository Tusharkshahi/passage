import { createServer as createHttpServer } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { lookupIcd10 } from './tools/icd10.js';
import { lookupProcedureCode, validateCodeMatch } from './tools/procedures.js';
import { checkPolicyCoverage, type CoverageInput } from './tools/coverage.js';
import { estimateCost, type CostInput } from './tools/cost.js';
import { validatePreauthPackage } from './tools/validate.js';
import { finalizePreauthPackage } from './tools/finalize.js';

// ---------------------------------------------------------------------------
// MCP Server factory — called once per connection so each gets a fresh instance.
// This avoids the "Already connected to a transport" crash when TrueForge
// reconnects or makes multiple SSE connections to the same process.
// ---------------------------------------------------------------------------
function createMcpServer(): Server {
  const server = new Server(
    { name: 'preauth-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'lookup_icd10',
        description:
          'Look up ICD-10 diagnosis codes for a condition described in plain language or medical terminology.',
        inputSchema: {
          type: 'object',
          properties: {
            diagnosis: {
              type: 'string',
              description:
                'Diagnosis in plain English or medical terminology (e.g. "gallstones", "appendicitis")',
            },
          },
          required: ['diagnosis'],
        },
      },
      {
        name: 'lookup_procedure_code',
        description: 'Look up ICD-10 PCS procedure codes for a proposed surgery or intervention.',
        inputSchema: {
          type: 'object',
          properties: {
            procedure: {
              type: 'string',
              description:
                'Procedure name in plain English (e.g. "laparoscopic cholecystectomy", "knee replacement")',
            },
          },
          required: ['procedure'],
        },
      },
      {
        name: 'validate_code_match',
        description:
          'Validate that a procedure code is clinically consistent with a diagnosis code. Returns valid/invalid with reasoning.',
        inputSchema: {
          type: 'object',
          properties: {
            diagnosis_code: {
              type: 'string',
              description: 'ICD-10 diagnosis code (e.g. "K80.20")',
            },
            procedure_code: {
              type: 'string',
              description: 'ICD-10 PCS procedure code (e.g. "0FB44ZZ")',
            },
          },
          required: ['diagnosis_code', 'procedure_code'],
        },
      },
      {
        name: 'check_policy_coverage',
        description:
          'Check if a procedure is covered under a policy. Verifies waiting periods, sub-limits, and remaining sum insured.',
        inputSchema: {
          type: 'object',
          properties: {
            policy_number: { type: 'string' },
            insurer: {
              type: 'string',
              description: 'Insurer name (e.g. "Star Health", "SBI General")',
            },
            diagnosis_code: { type: 'string' },
            procedure_code: { type: 'string' },
            estimated_cost: { type: 'number', description: 'Total estimated cost in INR' },
            patient_dob: { type: 'string', description: 'Patient date of birth (YYYY-MM-DD)' },
            policy_start_date: { type: 'string', description: 'Policy start date (YYYY-MM-DD)' },
            sum_insured: {
              type: 'number',
              description: 'Policy sum insured in INR (default 500000)',
            },
            prior_claims: {
              type: 'number',
              description: 'Prior claims already settled this policy year (default 0)',
            },
          },
          required: [
            'policy_number',
            'insurer',
            'diagnosis_code',
            'procedure_code',
            'estimated_cost',
            'patient_dob',
            'policy_start_date',
          ],
        },
      },
      {
        name: 'estimate_cost',
        description:
          'Estimate procedure cost breakdown by city tier and hospital category. Returns itemised breakdown (room, surgeon, anesthesia, OT, investigations, pharmacy, consumables).',
        inputSchema: {
          type: 'object',
          properties: {
            procedure_code: { type: 'string', description: 'ICD-10 PCS procedure code' },
            city: {
              type: 'string',
              description: 'Hospital city (e.g. "Mumbai", "Pune", "Jaipur")',
            },
            hospital_tier: {
              type: 'string',
              enum: ['A', 'B', 'C'],
              description: 'A = metro premium, B = metro standard / tier-2 city, C = tier-3 city',
            },
            stay_days: {
              type: 'number',
              description: 'Expected stay in days (optional — uses procedure default if omitted)',
            },
          },
          required: ['procedure_code', 'city', 'hospital_tier'],
        },
      },
      {
        name: 'validate_preauth_package',
        description:
          'Validate a pre-auth package for completeness against TPA-specific requirements. Returns missing fields and risk flags. Non-destructive — does not submit or lock.',
        inputSchema: {
          type: 'object',
          properties: {
            tpa: {
              type: 'string',
              description: 'TPA name (e.g. "Medi Assist", "Star Health", "Raksha TPA")',
            },
            preauth_data: {
              type: 'object',
              description: 'The assembled pre-auth package as a JSON object',
            },
          },
          required: ['tpa', 'preauth_data'],
        },
      },
      {
        name: 'finalize_preauth_package',
        description:
          'REQUIRES HUMAN APPROVAL. Locks and finalizes the pre-auth package for TPA submission. Produces a submission-ready document. This action is irreversible — it starts the IRDAI 1-hour approval clock once uploaded to the TPA portal.',
        inputSchema: {
          type: 'object',
          properties: {
            tpa: { type: 'string', description: 'TPA name' },
            preauth_data: {
              type: 'object',
              description: 'The fully assembled and validated pre-auth package',
            },
            coordinator_confirmed: {
              type: 'boolean',
              description:
                'Must be true — set only after the coordinator has reviewed and approved the package',
            },
          },
          required: ['tpa', 'preauth_data', 'coordinator_confirmed'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'lookup_icd10':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await lookupIcd10(args!['diagnosis'] as string)),
              },
            ],
          };

        case 'lookup_procedure_code':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await lookupProcedureCode(args!['procedure'] as string)),
              },
            ],
          };

        case 'validate_code_match':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  await validateCodeMatch(
                    args!['diagnosis_code'] as string,
                    args!['procedure_code'] as string
                  )
                ),
              },
            ],
          };

        case 'check_policy_coverage':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await checkPolicyCoverage(args as unknown as CoverageInput)),
              },
            ],
          };

        case 'estimate_cost':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await estimateCost(args as unknown as CostInput)),
              },
            ],
          };

        case 'validate_preauth_package':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  await validatePreauthPackage(
                    args!['tpa'] as string,
                    args!['preauth_data'] as Record<string, unknown>
                  )
                ),
              },
            ],
          };

        case 'finalize_preauth_package':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  await finalizePreauthPackage(
                    args!['tpa'] as string,
                    args!['preauth_data'] as Record<string, unknown>,
                    args!['coordinator_confirmed'] as boolean
                  )
                ),
              },
            ],
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  });

  return server;
}

// ---------------------------------------------------------------------------
// Transport selection
//   stdio (default): node dist/index.js
//   HTTP/SSE:        node dist/index.js --http --port 3001
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const httpMode = args.includes('--http');
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 ? parseInt(args[portIndex + 1] ?? '3001', 10) : 3001;

if (httpMode) {
  // HTTP/SSE mode — one fresh Server per SSE connection, no "already connected" crash
  const transports = new Map<string, SSEServerTransport>();

  const httpServer = createHttpServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/sse') {
      const transport = new SSEServerTransport('/messages', res);
      const sessionId = transport.sessionId;
      transports.set(sessionId, transport);

      res.on('close', () => {
        transports.delete(sessionId);
      });

      const mcpServer = createMcpServer();
      void mcpServer.connect(transport);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/messages') {
      const sessionId = url.searchParams.get('sessionId') ?? '';
      const transport = transports.get(sessionId);
      if (!transport) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not found' }));
        return;
      }
      void transport.handlePostMessage(req, res);
      return;
    }

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', server: 'preauth-mcp', version: '0.1.0' }));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  httpServer.listen(port, () => {
    console.error(`preauth-mcp HTTP/SSE server listening on http://localhost:${port}/sse`);
    console.error('Connect TrueForge to: http://localhost:' + port + '/sse');
  });
} else {
  // stdio mode — single connection, correct for CLI / supergateway use
  const mcpServer = createMcpServer();
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}
