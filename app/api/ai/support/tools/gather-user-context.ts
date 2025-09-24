import { tool as createTool } from 'ai'
import { z } from 'zod'

export const gatherUserContext = createTool({
  description: 'Gather comprehensive user context including account info, recent activity, and platform state',
  inputSchema: z.object({
    userId: z.string().optional().describe('User ID if available'),
    issueCategory: z.enum([
      'data_import', 
      'analytics', 
      'account_management', 
      'billing', 
      'technical_error', 
      'feature_request', 
      'general_inquiry'
    ]).describe('Category of the support issue'),
    urgency: z.enum(['low', 'medium', 'high', 'critical']).describe('Urgency level of the issue'),
    platform: z.enum(['web', 'mobile', 'api']).describe('Platform where issue occurred'),
    browserInfo: z.string().optional().describe('Browser and version if web platform'),
    errorMessage: z.string().optional().describe('Any error messages encountered'),
    stepsToReproduce: z.array(z.string()).optional().describe('Steps to reproduce the issue'),
    expectedBehavior: z.string().optional().describe('What the user expected to happen'),
    actualBehavior: z.string().optional().describe('What actually happened'),
    affectedFeatures: z.array(z.string()).optional().describe('Features affected by the issue'),
    dataInvolved: z.string().optional().describe('Type of data involved (trades, accounts, etc.)'),
    timeOfIssue: z.string().optional().describe('When the issue occurred'),
    frequency: z.enum(['once', 'intermittent', 'always']).optional().describe('How often the issue occurs'),
    workaround: z.string().optional().describe('Any workaround the user has found'),
    additionalContext: z.string().optional().describe('Any additional context or details')
  }),
  execute: async function (context) {
    // This tool doesn't execute logic, just signals comprehensive context gathering
    return { 
      contextGathered: true, 
      context,
      timestamp: new Date().toISOString(),
      message: 'Comprehensive user context has been gathered for efficient support resolution'
    }
  },
})
