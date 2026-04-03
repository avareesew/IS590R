import * as pdfParseModule from "pdf-parse";
// pdf-parse exports differently depending on bundler; handle both shapes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> =
  (pdfParseModule as any).default ?? pdfParseModule;

export interface ExtractedDocument {
  filename: string;
  text: string;
  pageCount: number;
  charCount: number;
}

export async function extractText(
  buffer: Buffer,
  filename: string
): Promise<ExtractedDocument> {
  const data = await pdfParse(buffer);
  return {
    filename,
    text: data.text,
    pageCount: data.numpages,
    charCount: data.text.length,
  };
}
