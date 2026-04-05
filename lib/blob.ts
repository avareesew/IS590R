import { put } from "@vercel/blob";

export async function uploadPdf(
  filename: string,
  buffer: Buffer
): Promise<string> {
  const { url } = await put(`pdfs/${Date.now()}-${filename}`, buffer, {
    access: "private",
    contentType: "application/pdf",
  });
  return url;
}

export async function downloadPdf(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
