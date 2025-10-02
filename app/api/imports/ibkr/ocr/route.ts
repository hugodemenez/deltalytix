import PDFParser from 'pdf2json'

export const maxDuration = 60 // Allow up to 60 seconds for AI processing

// Simple PDF to text extraction function using pdf2json
async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Use pdf2json for more reliable PDF processing
      const pdfParser = new PDFParser()

      let extractedText = ''

      // Set up event handlers
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('PDF parsing error:', errData)
        const errorMessage = errData instanceof Error ? errData.message : 'PDF parsing failed'
        resolve(`PDF processing failed: ${errorMessage}. Please ensure the PDF file is valid and not password protected.`)
      })

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages
          pdfData.Pages.forEach((page: any) => {
            page.Texts.forEach((text: any) => {
              text.R.forEach((run: any) => {
                extractedText += decodeURIComponent(run.T) + ' '
              })
            })
            extractedText += '\n' // Add newline after each page
          })

          resolve(extractedText.trim())
        } catch (processingError) {
          console.error('Error processing PDF data:', processingError)
          const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error'
          resolve(`PDF processing failed: ${errorMessage}. Please ensure the PDF file is valid and not password protected.`)
        }
      })

      // Parse the PDF buffer
      pdfParser.parseBuffer(pdfBuffer)

    } catch (error) {
      console.error('Error setting up PDF parser:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      resolve(`PDF processing failed: ${errorMessage}. Please ensure the PDF file is valid and not password protected.`)
    }
  })
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const attachment = json.attachments?.[0]

    if (!attachment) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (attachment.type !== 'application/pdf') {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only PDF files are allowed.' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Read the PDF file as buffer
    let pdfBuffer: Buffer;
    try {
      if (attachment.content instanceof ArrayBuffer) {
        pdfBuffer = Buffer.from(attachment.content);
      } else if (typeof attachment.content === 'string') {
        // Handle base64 encoded content
        pdfBuffer = Buffer.from(attachment.content, 'base64');
      } else {
        return new Response(JSON.stringify({ error: 'Invalid file content format' }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error('Error processing file content:', error);
      return new Response(JSON.stringify({ error: 'Failed to process file content' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract text from PDF
    const extractedText = await extractTextFromPdf(pdfBuffer)
    console.log(extractedText.slice(0, 100))

    return new Response(JSON.stringify({ text: extractedText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process request' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 