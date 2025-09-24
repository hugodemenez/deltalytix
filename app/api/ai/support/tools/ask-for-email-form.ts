import { tool as createTool } from 'ai'
import { z } from 'zod'


export const askForEmailForm = createTool({
  description: 'Indicate that the conversation is ready for email support',
  inputSchema: z.object({
    summary: z.string().describe('Summary of the issue and gathered information'),
  }),
  execute: async function ({ summary }) {
    // This tool doesn't need to execute any logic, just signal the UI
    return { 
      readyForEmail: true, 
      summary,
      timestamp: new Date().toISOString()
    }
  },
})
