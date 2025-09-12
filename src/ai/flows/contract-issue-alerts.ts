'use server';

/**
 * @fileOverview Analyzes sales and purchase contracts for unusual clauses or potential risks, and alerts the manager to any concerning findings.
 *
 * - contractIssueAlerts - A function that analyzes contracts and triggers alerts based on identified issues.
 * - ContractIssueAlertsInput - The input type for the contractIssueAlerts function.
 * - ContractIssueAlertsOutput - The return type for the contractIssueAlerts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContractIssueAlertsInputSchema = z.object({
  contractText: z.string().describe('The full text of the contract to analyze.'),
  contractType: z.enum(['sales', 'purchase']).describe('The type of contract being analyzed.'),
  additionalContext: z.string().optional().describe('Any additional context about the contract that might be relevant.'),
});
export type ContractIssueAlertsInput = z.infer<typeof ContractIssueAlertsInputSchema>;

const ContractIssueAlertsOutputSchema = z.object({
  hasIssues: z.boolean().describe('Whether or not any potential issues were found in the contract.'),
  issues: z.array(z.string()).describe('A list of any issues found in the contract.'),
  summary: z.string().describe('A summary of the contract analysis and any potential risks identified.'),
});
export type ContractIssueAlertsOutput = z.infer<typeof ContractIssueAlertsOutputSchema>;

export async function contractIssueAlerts(input: ContractIssueAlertsInput): Promise<ContractIssueAlertsOutput> {
  return contractIssueAlertsFlow(input);
}

const contractAnalysisPrompt = ai.definePrompt({
  name: 'contractAnalysisPrompt',
  input: {schema: ContractIssueAlertsInputSchema},
  output: {schema: ContractIssueAlertsOutputSchema},
  prompt: `You are an expert legal analyst specializing in identifying potential risks in {{contractType}} contracts.

You will analyze the provided contract text for any unusual clauses, potential liabilities, or concerning findings.
Consider any additional context provided to better understand the contract's implications.

Contract Text: {{{contractText}}}
Additional Context: {{{additionalContext}}}

Based on your analysis, determine if there are any potential issues in the contract. If issues are identified, provide a detailed summary of the contract analysis, clearly outlining the identified risks and their potential impact.

Your analysis should be thorough and provide actionable insights to mitigate potential liabilities.

Please adhere to the following schema strictly when producing the output:
${JSON.stringify(ContractIssueAlertsOutputSchema.shape, null, 2)}`,
});

const contractIssueAlertsFlow = ai.defineFlow(
  {
    name: 'contractIssueAlertsFlow',
    inputSchema: ContractIssueAlertsInputSchema,
    outputSchema: ContractIssueAlertsOutputSchema,
  },
  async input => {
    const {output} = await contractAnalysisPrompt(input);
    return output!;
  }
);
