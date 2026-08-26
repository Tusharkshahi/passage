import { randomUUID } from 'node:crypto';

export interface FinalizeResult {
  success: boolean;
  package_id: string;
  finalized_at: string;
  tpa: string;
  summary: {
    patient_name: string;
    policy_number: string;
    diagnosis: string;
    procedure: string;
    estimated_total: number;
  };
  submission_ready: Record<string, unknown>;
  next_steps: string[];
}

/**
 * Finalizes the pre-auth package.
 *
 * IMPORTANT: This tool is gated — it requires human approval in TrueForge
 * before being called. The coordinator_confirmed flag must be true.
 *
 * This does NOT submit to the TPA directly. It produces a finalized,
 * submission-ready package that the coordinator uploads to the TPA portal.
 */
export async function finalizePreauthPackage(
  tpa: string,
  preauthData: Record<string, unknown>,
  coordinatorConfirmed: boolean
): Promise<FinalizeResult> {
  if (!coordinatorConfirmed) {
    throw new Error(
      'Finalization requires explicit coordinator approval. coordinator_confirmed must be true.'
    );
  }

  const packageId = `PASSAGE-${randomUUID().slice(0, 8).toUpperCase()}`;
  const finalizedAt = new Date().toISOString();

  const estimatedTotal =
    ((preauthData['cost_room'] as number) ?? 0) +
    ((preauthData['cost_surgeon'] as number) ?? 0) +
    ((preauthData['cost_anesthesia'] as number) ?? 0) +
    ((preauthData['cost_ot'] as number) ?? 0) +
    ((preauthData['cost_investigations'] as number) ?? 0) +
    ((preauthData['cost_pharmacy'] as number) ?? 0) +
    ((preauthData['cost_consumables'] as number) ?? 0);

  return {
    success: true,
    package_id: packageId,
    finalized_at: finalizedAt,
    tpa,
    summary: {
      patient_name: (preauthData['patient_name'] as string) ?? 'Unknown',
      policy_number: (preauthData['policy_number'] as string) ?? 'Unknown',
      diagnosis: (preauthData['primary_diagnosis'] as string) ?? 'Unknown',
      procedure: (preauthData['proposed_procedure'] as string) ?? 'Unknown',
      estimated_total: estimatedTotal,
    },
    submission_ready: {
      ...preauthData,
      passage_package_id: packageId,
      passage_finalized_at: finalizedAt,
      passage_tpa: tpa,
    },
    next_steps: [
      `Log in to the ${tpa} portal`,
      'Navigate to "New Pre-Authorization Request"',
      'Upload this package or copy the fields from the submission_ready object',
      `Submit and note the TPA reference number (IRDAI 1-hour clock starts now)`,
      'Keep package ID ' + packageId + ' for your records',
    ],
  };
}
