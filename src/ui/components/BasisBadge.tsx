import type { ClaimTermBasis } from "../contract-types";

export const BASIS_DESCRIPTIONS: Record<ClaimTermBasis, { label: string; explanation: string }> = {
  explicit: { label: "Defined", explanation: "The document states a definition for this term." },
  contextual: { label: "Inferred", explanation: "Meaning inferred from surrounding text; no express definition." },
  visual: { label: "From figures", explanation: "Meaning drawn from drawings or figure references." },
  unsupported: { label: "No support", explanation: "No supporting passage was found in this document." },
};

export function BasisBadge({ basis }: { basis: ClaimTermBasis }) {
  const basisDescription = BASIS_DESCRIPTIONS[basis];
  return (
    <span className={"ncc-basis ncc-basis-" + basis} title={basisDescription.explanation}>
      <span className="ncc-basis-dot" aria-hidden="true" />
      {basisDescription.label}
    </span>
  );
}
