import type { PDFPageProxy } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

const SAME_LINE_VERTICAL_TOLERANCE = 2;
const WORD_GAP_HORIZONTAL_TOLERANCE = 1;

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null && "str" in item;
}

/**
 * Collects the real text of a page, keeping line breaks.
 * Patent PDFs print column line numbers (5, 10, 15...) as their own text runs,
 * so we break lines whenever PDF.js reports an end-of-line or the baseline moves.
 */
export async function extractPageTextWithLineBreaks(pdfPage: PDFPageProxy): Promise<string> {
  const textContent = await pdfPage.getTextContent();
  let pageText = "";
  let previousBaselineY: number | null = null;
  let previousRunEndX: number | null = null;

  for (const contentItem of textContent.items) {
    if (!isTextItem(contentItem)) continue;
    const runX = contentItem.transform[4];
    const runBaselineY = contentItem.transform[5];

    const startsNewLine =
      previousBaselineY !== null && Math.abs(runBaselineY - previousBaselineY) > SAME_LINE_VERTICAL_TOLERANCE;
    if (startsNewLine && !pageText.endsWith("\n")) {
      pageText += "\n";
    } else if (
      !startsNewLine &&
      previousRunEndX !== null &&
      runX - previousRunEndX > WORD_GAP_HORIZONTAL_TOLERANCE &&
      !pageText.endsWith(" ") &&
      !pageText.endsWith("\n") &&
      !contentItem.str.startsWith(" ")
    ) {
      pageText += " ";
    }

    pageText += contentItem.str;
    if (contentItem.hasEOL && !pageText.endsWith("\n")) pageText += "\n";

    previousBaselineY = runBaselineY;
    previousRunEndX = runX + contentItem.width;
  }

  return pageText.replace(/[ \t]+\n/g, "\n").trim();
}
