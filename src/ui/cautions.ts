import type { ClaimDocument } from "./contract-types";

export const TEXT_ONLY_CAUTION = "Pasted text has no drawings. Figure references cannot be visually verified.";

function cautionKey(message: string): string {
  const normalizedMessage = message.trim().replace(/\s+/g, " ").toLowerCase();
  // These are the two legacy UI/server versions of the same document limitation.
  if (normalizedMessage === TEXT_ONLY_CAUTION.toLowerCase() ||
      normalizedMessage === "pasted text has no drawings, so figure-based support is unavailable.") {
    return "text-only-no-drawings";
  }
  return normalizedMessage;
}

export function uniqueCautions(messages: readonly string[]): string[] {
  const seen = new Set<string>();
  return messages.filter(message => {
    const key = cautionKey(message);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(message => message.trim());
}

export function getDocumentCautions(document: Pick<ClaimDocument, "inputType" | "warnings">): string[] {
  return uniqueCautions([
    ...document.warnings,
    ...(document.inputType === "text" ? [TEXT_ONLY_CAUTION] : []),
  ]);
}

export function getAnalysisCautions(analysisWarnings: readonly string[], documentCautions: readonly string[]): string[] {
  const documentKeys = new Set(documentCautions.map(cautionKey));
  return uniqueCautions(analysisWarnings).filter(message => !documentKeys.has(cautionKey(message)));
}
