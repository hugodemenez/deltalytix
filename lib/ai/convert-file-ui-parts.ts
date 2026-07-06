import type { FileUIPart } from "ai";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

/** Ensures file parts use data URLs so server-side model conversion succeeds. */
export async function convertFileUIPartsToDataURLs(
  files: FileUIPart[],
): Promise<FileUIPart[]> {
  return Promise.all(
    files.map(async (file) => {
      if (!file.url?.startsWith("blob:")) {
        return file;
      }

      return {
        ...file,
        url: await blobUrlToDataUrl(file.url),
      };
    }),
  );
}

export function hasUnsupportedFileUrls(
  messages: Array<{ parts?: Array<{ type?: string; url?: string }> }>,
): boolean {
  return messages.some((message) =>
    message.parts?.some(
      (part) =>
        part.type === "file" &&
        typeof part.url === "string" &&
        !part.url.startsWith("data:"),
    ),
  );
}
