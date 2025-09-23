import { tool as createTool } from 'ai'
import { z } from 'zod'

export const askForHumanHelp = createTool({
  description: 'Indicate that the user needs human support assistance',
  inputSchema: z.object({
    reason: z.string().describe('Brief explanation of why human help is needed'),
  }),
  execute: async function ({ reason }) {
    // This tool doesn't need to execute any logic, just signal the UI
    return { 
      needsHumanHelp: true, 
      reason,
      timestamp: new Date().toISOString()
    }
  },
})
