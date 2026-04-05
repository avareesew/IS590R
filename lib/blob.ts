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
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
