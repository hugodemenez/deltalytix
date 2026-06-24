"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import readExcelFile from "read-excel-file/browser";
import type { CellValue } from "read-excel-file/browser";
import { ImportType } from "../import-type-selection";
import { Progress } from "@/components/ui/progress";
import { XIcon, FileIcon, AlertCircle, ArrowUpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/locales/client";
import { formatAtasExcelDateCell } from "@/lib/atas-date";
import { Step } from "../import-button";

interface AtasFileUploadProps {
  importType: ImportType;
  setRawCsvData: React.Dispatch<React.SetStateAction<string[][]>>;
  setCsvData: React.Dispatch<React.SetStateAction<string[][]>>;
  setHeaders: React.Dispatch<React.SetStateAction<string[]>>;
  setStep: React.Dispatch<React.SetStateAction<Step>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const EXPECTED_ATAS_COLUMNS = [
  "Account",
  "Instrument",
  "Open time",
  "Open price",
  "Open volume",
  "Close time",
  "Close price",
  "Close volume",
  "PnL",
];

const ATAS_JOURNAL_SHEET_NAMES = ["Journal", "Journal commercial"];

const ATAS_HEADER_MAPPINGS: Record<string, string> = {
  account: "Account",
  compte: "Account",
  instrument: "Instrument",
  outil: "Instrument",
  "open time": "Open time",
  "heure d'ouverture": "Open time",
  "open price": "Open price",
  "prix d'ouverture": "Open price",
  "open volume": "Open volume",
  "volume d'ouverture": "Open volume",
  "close time": "Close time",
  "heure de cloture": "Close time",
  "heure de clôture": "Close time",
  "close price": "Close price",
  "prix de cloture": "Close price",
  "prix de clôture": "Close price",
  "close volume": "Close volume",
  volume: "Close volume",
  pnl: "PnL",
  comment: "Comment",
  commentaire: "Comment",
};

const normalizeAtasHeaderKey = (header: string): string =>
  header
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u00A0\u202F]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeAtasHeader = (header: string): string =>
  ATAS_HEADER_MAPPINGS[normalizeAtasHeaderKey(header)] || header.trim();

const formatAtasCell = (value: CellValue | null): string => {
  if (value == null) return "";
  if (value instanceof Date) return formatAtasExcelDateCell(value);

  return String(value);
};

const parseAtasWorkbook = async (data: ArrayBuffer): Promise<string[][]> => {
  const sheets = await readExcelFile(data);
  const journalSheet = sheets.find(({ sheet }) =>
    ATAS_JOURNAL_SHEET_NAMES.some(
      (sheetName) =>
        normalizeAtasHeaderKey(sheetName) === normalizeAtasHeaderKey(sheet),
    ),
  );

  if (!journalSheet) {
    throw new Error(
      "Could not find 'Journal' sheet in the Excel file. Please make sure the sheet is named 'Journal' or 'Journal commercial'.",
    );
  }

  const jsonData = journalSheet.data
    .map((row) => row.map(formatAtasCell))
    .filter((row) => row.some((cell) => cell !== ""));

  if (jsonData.length === 0) {
    throw new Error("The Journal sheet appears to be empty.");
  }

  const headerRowIndex = jsonData.findIndex((row) =>
    row.some((cell) => cell.trim() !== ""),
  );

  if (headerRowIndex === -1) {
    throw new Error("The Journal sheet appears to be empty.");
  }

  const headers = jsonData[headerRowIndex].map(normalizeAtasHeader);
  const dataRows = jsonData
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => cell !== ""));

  const missingColumns = EXPECTED_ATAS_COLUMNS.filter(
    (column) => !headers.includes(column),
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}. Please make sure your Excel file has the correct format.`,
    );
  }

  return [headers, ...dataRows];
};

export default function AtasFileUpload({
  setRawCsvData,
  setCsvData,
  setHeaders,
  setStep,
  setError,
}: AtasFileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [parsedFiles, setParsedFiles] = useState<string[][][]>([]);
  const t = useI18n();

  const processExcelFile = useCallback(
    async (file: File, index: number) => {
      return new Promise<void>((resolve, reject) => {
        // Check if the file is an Excel file
        if (
          !file.name.toLowerCase().endsWith(".xlsx")
        ) {
          reject(new Error("Please upload an Excel file (.xlsx)"));
          return;
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const fileData = await parseAtasWorkbook(
              e.target?.result as ArrayBuffer,
            );

            setParsedFiles((prevFiles) => {
              const newFiles = [...prevFiles];
              newFiles[index] = fileData;
              return newFiles;
            });

            setError(null);
            resolve();
          } catch (error) {
            reject(
              new Error(
                `Error processing Excel file: ${(error as Error).message}`,
              ),
            );
          }
        };

        reader.onerror = () => {
          reject(new Error("Error reading file"));
        };

        reader.readAsArrayBuffer(file);
      });
    },
    [setError],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setUploadedFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
      acceptedFiles.forEach((file, index) => {
        const totalIndex = uploadedFiles.length + index;
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
        processExcelFile(file, totalIndex)
          .then(() => {
            setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
          })
          .catch((error) => {
            setError(error.message);
            setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
          });
      });
    },
    [processExcelFile, setError, uploadedFiles.length],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setParsedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[uploadedFiles[index].name];
      return newProgress;
    });
  };

  const processFiles = useCallback(() => {
    if (parsedFiles.length === 0) return;

    try {
      // For ATAS, we expect the data to be in the correct format already
      // since we've extracted it from the Journal sheet
      const fileData = parsedFiles[0]; // We only support one file for ATAS
      if (fileData.length < 2) {
        throw new Error("Invalid file format");
      }

      const headers = fileData[0];
      const dataRows = fileData.slice(1);

      setRawCsvData(fileData);
      setCsvData(dataRows);
      setHeaders(headers);

      // Move to the next step (preview trades)
      setStep("preview-trades");

      setError(null);
    } catch (error) {
      setError((error as Error).message);
    }
  }, [parsedFiles, setRawCsvData, setCsvData, setHeaders, setStep, setError]);

  useEffect(() => {
    if (
      parsedFiles.length > 0 &&
      parsedFiles.length === uploadedFiles.length &&
      Object.values(uploadProgress).every((progress) => progress === 100)
    ) {
      processFiles();
    }
  }, [parsedFiles, uploadProgress, processFiles, uploadedFiles.length]);

  return (
    <div className="space-y-4 w-full h-full p-8 flex flex-col items-center justify-center">
      <div
        {...getRootProps()}
        className={cn(
          "h-80 w-full max-w-2xl border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ease-in-out",
          "hover:border-primary/50 group relative",
          isDragActive
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-900/50",
          "cursor-pointer flex items-center justify-center",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <ArrowUpCircle
            className={cn(
              "h-14 w-14 transition-all duration-300 ease-bounce",
              isDragActive
                ? "text-primary scale-110 -translate-y-2"
                : "text-muted-foreground group-hover:text-primary group-hover:scale-110 group-hover:-translate-y-2",
            )}
          />
          {isDragActive ? (
            <div className="space-y-2 relative">
              <p className="text-xl font-medium text-primary animate-in fade-in slide-in-from-bottom-2">
                {t("import.upload.dropHere")}
              </p>
              <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-3">
                {t("import.upload.weWillHandle")}
              </p>
            </div>
          ) : (
            <div className="space-y-2 relative">
              <p className="text-xl font-medium group-hover:text-primary transition-colors">
                {t("import.upload.dragAndDropExcel")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("import.upload.clickToBrowseExcel")}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("import.upload.excelFormat")}
              </p>
            </div>
          )}
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500 w-full max-w-2xl">
          <h3 className="text-lg font-semibold">
            {t("import.upload.uploadedFiles")}
          </h3>
          {uploadedFiles.map((file, index) => (
            <div
              key={file.name}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <FileIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {uploadProgress[file.name] !== undefined && (
                  <div className="w-20">
                    <Progress
                      value={uploadProgress[file.name]}
                      className="h-2"
                    />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 p-0"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="w-full max-w-2xl">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("import.upload.excelNote")}</AlertTitle>
            <AlertDescription>
              {t("import.upload.excelNoteDescription")}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
