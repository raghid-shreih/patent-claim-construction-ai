import type { ClaimDocument, ClaimInputType, ClaimInterpretation } from "../contract-types";

export type WorkflowPhase = "intake" | "extracting" | "preparing" | "ready";

export interface ProgressReport {
  stageLabel: string;
  detail: string;
  completedUnits: number;
  totalUnits: number;
}

export interface RecoverableError {
  message: string;
  canRetry: boolean;
  requiresReload: boolean;
}

export interface EvidenceSelection {
  termIndex: number;
  evidenceIndex: number;
}

export interface ClaimSessionState {
  workflowPhase: WorkflowPhase;
  inputType: ClaimInputType | null;
  progress: ProgressReport | null;
  preparedDocument: ClaimDocument | null;
  selectedClaimNumber: number | null;
  analyzingClaimNumber: number | null;
  interpretationsByClaimNumber: Record<number, ClaimInterpretation>;
  evidenceSelection: EvidenceSelection | null;
  intakeError: RecoverableError | null;
  analysisError: RecoverableError | null;
  sessionExpiresAtMilliseconds: number | null;
  sessionEndedNotice: string | null;
}

export const EMPTY_SESSION_STATE: ClaimSessionState = {
  workflowPhase: "intake",
  inputType: null,
  progress: null,
  preparedDocument: null,
  selectedClaimNumber: null,
  analyzingClaimNumber: null,
  interpretationsByClaimNumber: {},
  evidenceSelection: null,
  intakeError: null,
  analysisError: null,
  sessionExpiresAtMilliseconds: null,
  sessionEndedNotice: null,
};
