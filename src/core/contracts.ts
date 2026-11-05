import { z } from "zod";

export const DOCUMENT_LIMITS = {
  maximumPages: 16,
  maximumCharacters: 100_000,
  maximumPageCharacters: 20_000,
  maximumImageBytes: 800_000,
  sessionMinutes: 30,
} as const;

export const sourcePageSchema = z.object({
  pageNumber: z.number().int().min(1).max(DOCUMENT_LIMITS.maximumPages),
  text: z.string().max(DOCUMENT_LIMITS.maximumPageCharacters),
  imageDataUrl: z.string().max(1_100_000).optional(),
}).strict();

export const documentInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  inputType: z.enum(["pdf", "text"]),
  pages: z.array(sourcePageSchema).min(1).max(DOCUMENT_LIMITS.maximumPages),
}).strict().superRefine((document, context) => {
  if (document.pages.reduce((total, page) => total + page.text.length, 0) > DOCUMENT_LIMITS.maximumCharacters) {
    context.addIssue({ code: "custom", message: "Document exceeds 100,000 characters. Nothing was truncated." });
  }
  if (document.pages.some((page, index) => page.pageNumber !== index + 1)) {
    context.addIssue({ code: "custom", message: "Pages must be numbered consecutively from 1." });
  }
  if (document.inputType === "text" && document.pages.some(page => page.imageDataUrl)) {
    context.addIssue({ code: "custom", message: "Pasted text cannot include page images." });
  }
  if (document.inputType === "pdf" && document.pages.some(page => !page.imageDataUrl)) {
    context.addIssue({ code: "custom", message: "Every PDF page needs a page image, including drawings." });
  }
});

export const detectedClaimSchema = z.object({
  number: z.number().int().positive(),
  text: z.string().min(1).max(20_000),
  dependsOn: z.array(z.number().int().positive()).max(100),
}).strict();

export const claimSourceSchema = z.object({
  id: z.string(),
  pageNumber: z.number().int().positive(),
  text: z.string(),
  label: z.string(),
  visual: z.boolean(),
}).strict();

export const claimDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  inputType: z.enum(["pdf", "text"]),
  pages: z.array(sourcePageSchema),
  sources: z.array(claimSourceSchema),
  claims: z.array(detectedClaimSchema),
  warnings: z.array(z.string()),
  expiresAt: z.string().datetime(),
  receipt: z.string(),
}).strict();

export const analysisRequestSchema = z.object({
  document: claimDocumentSchema,
  claimNumber: z.number().int().positive(),
}).strict();

export const proposedAnalysisSchema = z.object({
  summary: z.string().min(1).max(6000),
  terms: z.array(z.object({
    term: z.string().min(1).max(200),
    meaning: z.string().min(1).max(3000),
    basis: z.enum(["explicit", "contextual", "visual", "unsupported"]),
    evidence: z.array(z.object({
      sourceId: z.string().max(100),
      quote: z.string().max(3000),
    }).strict()).max(8),
    caveat: z.string().max(2000),
  }).strict()).min(1).max(16),
  warnings: z.array(z.string().max(1000)).max(20),
}).strict();

export type DocumentInput = z.infer<typeof documentInputSchema>;
export type SourcePage = z.infer<typeof sourcePageSchema>;
export type DetectedClaim = z.infer<typeof detectedClaimSchema>;
export type ClaimSource = z.infer<typeof claimSourceSchema>;
export type ClaimDocument = z.infer<typeof claimDocumentSchema>;
export type ProposedAnalysis = z.infer<typeof proposedAnalysisSchema>;
export type ClaimInterpretation = ProposedAnalysis & {
  claimNumber: number;
  inheritedClaims: number[];
  disclaimer: string;
};

export class DemoError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
