import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { ImportType } from './import-type-selection'

interface FileUploadProps {
  importType: ImportType
  setRawCsvData: React.Dispatch<React.SetStateAction<string[][]>>
  setCsvData: React.Dispatch<React.SetStateAction<string[][]>>
  setHeaders: React.Dispatch<React.SetStateAction<string[]>>
  setStep: React.Dispatch<React.SetStateAction<number>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

export default function FileUpload({
  importType,
  setRawCsvData,
  setCsvData,
  setHeaders,
  setStep,
  setError
}: FileUploadProps) {

  const processRithmicPerformanceCsv = useCallback((data: string[][]) => {
    const processedData: string[][] = [];
    let currentAccountNumber = '';
    let currentInstrument = '';
    let headers: string[] = [];

    const isAccountNumber = (value: string) => {
      return value.length > 4 &&
        !/^[A-Z]{3}\d$/.test(value) &&
        !/^\d+$/.test(value) &&
        value !== 'Account' &&
        value !== 'Entry Order Number';
    };

    const isInstrument = (value: string) => {
      return /^[A-Z]{3}\d$/.test(value);
    };


    data.forEach((row) => {
      // Find the account number
      if (row[0] && isAccountNumber(row[0])) {
        currentAccountNumber = row[0];
      } else if (row[0] && isInstrument(row[0])) {
        // Find the instrument
        currentInstrument = row[0];
      } else if (row[0] === 'Entry Order Number') {
        // Set the headers
        headers = ['AccountNumber', 'Instrument', ...row];
      } else if (headers.length > 0 && row[0] && row[0] !== 'Entry Order Number' && row[0] !== 'Account') {
        // Process the data
        processedData.push([currentAccountNumber, currentInstrument, ...row]);
      }
    });

    if (processedData.length > 0 && headers.length > 0) {
      setCsvData(processedData);
      setHeaders(headers);
      setStep(3); // Skip header selection for Rithmic
    } else {
      setError("Unable to process Rithmic CSV. Please check the file format.");
    }
  }, []);

  const processRithmicOrdersCsv = useCallback((data: string[][]) => {
    // Header is always the row under the row with "Completed Orders" as first column
    const headerRowIndex = data.findIndex(row => row[0] === 'Completed Orders') + 1
    const headers = data[headerRowIndex].filter(header => header && header.trim() !== '')
    setHeaders(headers)
    setCsvData(data.slice(headerRowIndex + 1))
    setStep(3) // Go to header selection step
  }, []);

  const processTradovateCsv = useCallback((data: string[][]) => {
    // Header is always first row
    const headers = data[0].filter(header => header && header.trim() !== '')
    setHeaders(headers)
    setCsvData(data.slice(1))
    setStep(3) // Go to header selection step
  }, []);

  const processTradezellaCsv = useCallback((data: string[][]) => {
    // Header is always first row
    const headers = data[0].filter(header => header && header.trim() !== '')
    setHeaders(headers)
    setCsvData(data.slice(1))
    setStep(3) // Go to header selection step
  }, []);

  const processCsv = useCallback((data: string[][]) => {
    if (data.length > 0) {
      const headers = data[0].filter(header => header && header.trim() !== '')
      setHeaders(headers)
      setCsvData(data)
      setStep(2) // Go to header selection step
    } else {
      setError("The CSV file appears to be empty or invalid.")
    }
  }, [setCsvData, setHeaders, setStep, setError])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    Papa.parse(file, {
      complete: (result) => {
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          setRawCsvData(result.data as string[][])
          switch (importType) {
            case 'rithmic-performance':
              processRithmicPerformanceCsv(result.data as string[][])
              break
            case 'rithmic-orders':
              processRithmicOrdersCsv(result.data as string[][])
              break
            case 'tradovate':
              processTradovateCsv(result.data as string[][])
              break
            case 'tradezella':
              processTradezellaCsv(result.data as string[][])
              break
            default:
              processCsv(result.data as string[][])
          }
          setError(null)
        } else {
          setError("The CSV file appears to be empty or invalid.")
        }
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`)
      }
    })
  }, [importType, processRithmicPerformanceCsv, processCsv, setRawCsvData, setError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div className="space-y-4">
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the CSV file here ...</p>
        ) : (
          <p>Drag and drop a CSV file here, or click to select a file</p>
        )}
      </div>
    </div>
  )
}