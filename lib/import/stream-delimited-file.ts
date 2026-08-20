import Papa from "papaparse";

export function streamDelimitedFile(
  file: File,
  options: {
    delimiter: string;
    headers: string[];
    onChunk: (rows: string[][], bytesRead: number) => Promise<void>;
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    let skippedHeader = false;
    Papa.parse<string[]>(file, {
      delimiter: options.delimiter,
      skipEmptyLines: "greedy",
      chunk: (results, parser) => {
        parser.pause();
        let rows = results.data;
        if (!skippedHeader && rows[0] && sameRow(rows[0], options.headers)) {
          rows = rows.slice(1);
          skippedHeader = true;
        }
        const bytesRead = results.meta.cursor ?? 0;
        void options
          .onChunk(rows, bytesRead)
          .then(() => parser.resume())
          .catch((error) => {
            parser.abort();
            reject(error);
          });
      },
      complete: () => resolve(),
      error: (error) => reject(error),
    });
  });
}

function sameRow(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((cell, index) => cell === right[index]);
}
