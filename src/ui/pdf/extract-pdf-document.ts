import type { ClaimSourcePage } from "../contract-types";
import {
  InputLimitError,
  MAXIMUM_PAGE_COUNT,
  MAXIMUM_PDF_FILE_BYTES,
  assertPagesWithinTextLimits,
  formatByteSize,
} from "../input-limits";
import { closePdfDocument, openPdfFromBytes, type LoadedPdfDocument } from "./pdf-runtime";
import { extractPageTextWithLineBreaks } from "./pdf-text-extraction";
import { renderPageToJpegDataUrl } from "./pdf-page-rendering";

export interface PdfExtractionProgress {
  completedPageCount: number;
  totalPageCount: number;
  currentActivity: string;
}

export interface ExtractedPdf {
  loadedPdfDocument: LoadedPdfDocument;
  pages: ClaimSourcePage[];
}

export function assertPdfFileAcceptable(pdfFile: File): void {
  const looksLikePdf = pdfFile.type === "application/pdf" || pdfFile.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) throw new InputLimitError("Only PDF files can be uploaded. Paste text for other formats.");
  if (pdfFile.size > MAXIMUM_PDF_FILE_BYTES) {
    throw new InputLimitError(
      "This PDF is " + formatByteSize(pdfFile.size) + ". The limit is " + formatByteSize(MAXIMUM_PDF_FILE_BYTES) + ".",
    );
  }
}

/** Reads every page of the PDF: actual text plus a rendered image. Nothing is truncated. */
export async function extractPdfDocument(
  pdfFile: File,
  reportProgress: (progress: PdfExtractionProgress) => void,
  isCancelled: () => boolean,
): Promise<ExtractedPdf> {
  assertPdfFileAcceptable(pdfFile);
  reportProgress({ completedPageCount: 0, totalPageCount: 0, currentActivity: "Opening PDF" });

  const pdfBytes = await pdfFile.arrayBuffer();
  let loadedPdfDocument: LoadedPdfDocument;
  try {
    loadedPdfDocument = await openPdfFromBytes(pdfBytes);
  } catch {
    throw new InputLimitError("This file could not be opened as a PDF. It may be damaged or password protected.");
  }

  const totalPageCount = loadedPdfDocument.numPages;
  if (totalPageCount > MAXIMUM_PAGE_COUNT) {
    await closePdfDocument(loadedPdfDocument);
    throw new InputLimitError(
      "This PDF has " + totalPageCount + " pages. The limit is " + MAXIMUM_PAGE_COUNT +
        ". Upload a shorter excerpt that still contains the claims and relevant description.",
    );
  }

  const extractedPages: ClaimSourcePage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= totalPageCount; pageNumber += 1) {
      if (isCancelled()) throw new DOMException("Extraction cancelled", "AbortError");
      reportProgress({
        completedPageCount: pageNumber - 1,
        totalPageCount,
        currentActivity: "Reading text and rendering page " + pageNumber + " of " + totalPageCount,
      });
      const pdfPage = await loadedPdfDocument.getPage(pageNumber);
      const pageText = await extractPageTextWithLineBreaks(pdfPage);
      const pageImageDataUrl = await renderPageToJpegDataUrl(pdfPage);
      pdfPage.cleanup();
      extractedPages.push({ pageNumber, text: pageText, imageDataUrl: pageImageDataUrl });
    }
    assertPagesWithinTextLimits(extractedPages);
  } catch (extractionError) {
    await closePdfDocument(loadedPdfDocument);
    throw extractionError;
  }

  reportProgress({ completedPageCount: totalPageCount, totalPageCount, currentActivity: "All pages read" });
  return { loadedPdfDocument, pages: extractedPages };
}
