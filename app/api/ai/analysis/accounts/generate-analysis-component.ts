import { Output, tool } from "ai";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from 'zod/v3';
import { AccountAnalysisSchema, type AccountAnalysis } from './get-account-performance';

// Define the simplified schema for the structured analysis output (4 parts only)
const AnalysisOutputSchema = z.object({
  summary: z.string().describe('Brief overview of the overall portfolio performance'),
  strengths: z.array(z.string()).describe('Top 3-5 things that are working well'),
  improvements: z.array(z.string()).describe('Top 3-5 areas that need attention'),
  recommendations: z.array(z.string()).describe('Top 3-5 actionable recommendations')
});

export const generateAnalysisComponent = tool({
  description: 'Generate AI-powered text analysis of account performance data. This provides detailed insights and recommendations based on the account data.',
  inputSchema: z.object({
    locale: z.string().default('en').describe('Language for the analysis content'),
    username: z.string().optional().describe('Username for personalized analysis'),
    accountData: AccountAnalysisSchema.describe('Account performance data from getAccountPerformance tool')
  }),
  execute: async ({ 
    locale = 'en', 
    username,
    accountData
  }: {
    locale?: string;
    username?: string;
    accountData: AccountAnalysis;
  }) => {
    console.log(`[generateAnalysisComponent] Generating structured AI analysis for accounts analysis for ${username} in ${locale}`);
    
    // Generate timestamp
    const now = new Date().toISOString();
    
    // Create a comprehensive prompt for AI analysis
    const analysisPrompt = `# Trading Account Performance Analysis

You are an expert trading analyst. Analyze the following account performance data and provide detailed insights, recommendations, and analysis.

## Account Data Summary:
- Total Portfolio Value: $${accountData?.totalPortfolioValue?.toLocaleString() || 0}
- Number of Accounts: ${accountData?.accounts?.length || 0}

## Individual Account Performance:
${accountData?.accounts?.map(acc => `
Account ${acc.accountNumber}:
- Net PnL: $${acc.netPnL.toLocaleString()}
- Win Rate: ${acc.winRate.toFixed(1)}%
- Total Trades: ${acc.totalTrades}
- Profit Factor: ${acc.profitFactor.toFixed(2)}
- Risk Level: ${acc.riskLevel}
- Max Drawdown: ${acc.maxDrawdown.toFixed(2)}%
- Sharpe Ratio: ${acc.sharpeRatio.toFixed(2)}
- Most Traded Instrument: ${acc.mostTradedInstrument}
- Profitability: ${acc.profitability}
`).join('\n') || 'No account data available'}

## Analysis Requirements:
${locale === 'fr' ? `
Analysez ces données de performance de trading et fournissez une analyse simple avec 4 parties:

1. **Résumé**: Vue d'ensemble de la performance du portefeuille (2-3 phrases)
2. **Points Forts**: Top 3-5 choses qui fonctionnent bien (liste courte)
3. **Améliorations**: Top 3-5 domaines à améliorer (liste courte)
4. **Recommandations**: Top 3-5 actions concrètes à prendre (liste courte)

Soyez concis et actionnable. Maximum 3-5 points par section.
` : `
Analyze this trading account performance data and provide a simple 4-part analysis:

1. **Summary**: Overview of portfolio performance (2-3 sentences)
2. **Strengths**: Top 3-5 things that are working well (short list)
3. **Improvements**: Top 3-5 areas that need attention (short list)
4. **Recommendations**: Top 3-5 concrete actions to take (short list)

Be concise and actionable. Maximum 3-5 points per section.
`}

Please provide a comprehensive structured analysis that would be valuable for a trader looking to improve their performance.`;

    try {
      // Generate structured AI analysis using generateText
      const { output } = await generateText({
        model: 'openai/gpt-5-mini',
        output: Output.object({ schema: AnalysisOutputSchema }),
        prompt: analysisPrompt,
      });

      // Return the simplified structured AI analysis
      return {
        locale,
        username,
        generatedAt: now,
        structuredAnalysis: output,
        dataSummary: {
          totalAccounts: accountData?.accounts?.length || 0,
          totalPortfolioValue: accountData?.totalPortfolioValue || 0,
          portfolioRisk: 'unknown',
          bestAccount: 'N/A',
          worstAccount: 'N/A'
        },
      };
    } catch (error) {
      console.error('Error generating structured AI analysis:', error);
      return {
        locale,
        username,
        generatedAt: now,
        structuredAnalysis: {
          summary: locale === 'fr' 
            ? 'Erreur lors de la génération de l\'analyse. Veuillez réessayer.'
            : 'Error generating analysis. Please try again.',
          strengths: [],
          improvements: [],
          recommendations: []
        },
        error: true,
      };
    }
  }
});
