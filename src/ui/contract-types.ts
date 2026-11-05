// Contract types come from the core package so the UI and server never drift apart.
import type {
  ClaimDocument,
  ClaimInterpretation,
  ClaimSource,
  DetectedClaim,
  DocumentInput,
  SourcePage,
} from "../core/contracts";

export type { ClaimDocument, ClaimInterpretation, ClaimSource, DetectedClaim };
export type ClaimDocumentInput = DocumentInput;
export type ClaimSourcePage = SourcePage;
export type ClaimInputType = DocumentInput["inputType"];
export type ClaimAnalysisRequest = { document: ClaimDocument; claimNumber: number };
export type ClaimTermInterpretation = ClaimInterpretation["terms"][number];
export type ClaimTermBasis = ClaimTermInterpretation["basis"];
export type ClaimEvidence = ClaimTermInterpretation["evidence"][number];
export interface ErrorEnvelope {
  error: string;
}
