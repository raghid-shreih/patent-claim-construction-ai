// Hard limits shared with the server contract. Inputs beyond these are rejected, never truncated.

export const MAXIMUM_PAGE_COUNT = 16;
export const MAXIMUM_CHARACTERS_PER_PAGE = 20_000;
export const MAXIMUM_TOTAL_CHARACTERS = 100_000;
export const MAXIMUM_PDF_FILE_BYTES = 12 * 1024 * 1024;
export const MAXIMUM_REQUEST_BODY_BYTES = 18 * 1024 * 1024;
export const MAXIMUM_PAGE_IMAGE_BYTES = 800_000;
export const PAGE_IMAGE_LONGEST_EDGE_PIXELS = 768;
export const PAGE_IMAGE_JPEG_QUALITY = 0.7;
export const MAXIMUM_TITLE_LENGTH = 200;
export const LOCAL_SESSION_DURATION_MILLISECONDS = 30 * 60 * 1000;

export class InputLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputLimitError";
  }
}

export function formatByteSize(byteCount: number): string {
  if (byteCount < 1024) return byteCount + " B";
  if (byteCount < 1_000_000) return Math.round(byteCount / 1000) + " KB";
  return (byteCount / (1024 * 1024)).toFixed(1) + " MB";
}

export function assertPagesWithinTextLimits(pages: { pageNumber: number; text: string }[]): void {
  if (pages.length === 0) {
    throw new InputLimitError("No pages were found to send.");
  }
  if (pages.length > MAXIMUM_PAGE_COUNT) {
    throw new InputLimitError(
      "This document has " + pages.length + " pages. The limit is " + MAXIMUM_PAGE_COUNT + " pages.",
    );
  }
  let totalCharacterCount = 0;
  for (const page of pages) {
    if (page.text.length > MAXIMUM_CHARACTERS_PER_PAGE) {
      throw new InputLimitError(
        "Page " + page.pageNumber + " contains " + page.text.length.toLocaleString() +
          " characters. Each page may contain at most " + MAXIMUM_CHARACTERS_PER_PAGE.toLocaleString() + ".",
      );
    }
    totalCharacterCount += page.text.length;
  }
  if (totalCharacterCount > MAXIMUM_TOTAL_CHARACTERS) {
    throw new InputLimitError(
      "The document contains " + totalCharacterCount.toLocaleString() +
        " characters in total. The limit is " + MAXIMUM_TOTAL_CHARACTERS.toLocaleString() + ".",
    );
  }
}
