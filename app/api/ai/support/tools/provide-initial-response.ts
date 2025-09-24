import { tool as createTool } from 'ai'
import { z } from 'zod'

export const provideInitialResponse = createTool({
  description: 'Provide an initial helpful response while gathering additional context if needed',
  inputSchema: z.object({
    responseType: z.enum([
      'immediate_solution',
      'partial_solution_with_follow_up',
      'acknowledgment_with_investigation',
      'escalation_notice'
    ]).describe('Type of initial response to provide'),
    solution: z.string().optional().describe('Immediate solution if available'),
    nextSteps: z.array(z.string()).optional().describe('Next steps for the user'),
    additionalInfoNeeded: z.array(z.string()).optional().describe('Additional information still needed'),
    estimatedTime: z.string().optional().describe('Estimated time for resolution'),
    resources: z.array(z.object({
      type: z.enum(['documentation', 'tutorial', 'video', 'faq', 'community']),
      title: z.string(),
      url: z.string().optional(),
      description: z.string()
    })).optional().describe('Helpful resources for the user'),
    confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level in the response'),
    requiresFollowUp: z.boolean().describe('Whether this issue requires follow-up'),
    escalationReason: z.string().optional().describe('Reason for escalation if applicable')
  }),
  execute: async function (response) {
    return { 
      responseProvided: true, 
      response,
      timestamp: new Date().toISOString(),
      message: 'Initial response provided with appropriate next steps'
    }
  },
})
