import { tool as createTool } from 'ai'
import { z } from 'zod'

export const analyzeIssueComplexity = createTool({
  description: 'Analyze the complexity and type of the support issue to determine the best resolution path',
  inputSchema: z.object({
    issueType: z.enum([
      'simple_question',
      'configuration_help', 
      'data_processing_issue',
      'technical_bug',
      'feature_limitation',
      'account_issue',
      'billing_question',
      'integration_problem',
      'performance_issue',
      'security_concern'
    ]).describe('Type of issue identified'),
    complexity: z.enum(['low', 'medium', 'high']).describe('Complexity level of the issue'),
    requiresTechnicalExpertise: z.boolean().describe('Whether issue requires technical expertise'),
    requiresAccountAccess: z.boolean().describe('Whether issue requires access to user account'),
    canBeResolvedWithDocumentation: z.boolean().describe('Whether issue can be resolved with documentation'),
    estimatedResolutionTime: z.enum(['minutes', 'hours', 'days', 'weeks']).describe('Estimated time to resolve'),
    suggestedResolutionPath: z.enum([
      'self_service',
      'documentation_reference',
      'email_support',
      'human_support',
      'technical_escalation',
      'product_team_escalation'
    ]).describe('Suggested resolution path'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).describe('Priority level for resolution'),
    tags: z.array(z.string()).describe('Tags to categorize the issue'),
    relatedFeatures: z.array(z.string()).describe('Features related to this issue')
  }),
  execute: async function (analysis) {
    return { 
      analysisComplete: true, 
      analysis,
      timestamp: new Date().toISOString(),
      message: 'Issue complexity analysis completed for optimal support routing'
    }
  },
})
