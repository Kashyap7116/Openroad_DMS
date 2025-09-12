'use server';

/**
 * @fileOverview Analyzes software errors, provides a root cause analysis, and suggests a solution.
 *
 * - errorAnalysisAlerts - A function that analyzes errors and returns a structured analysis.
 * - ErrorAnalysisAlertsInput - The input type for the errorAnalysisAlerts function.
 * - ErrorAnalysisAlertsOutput - The return type for the errorAnalysisAlerts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ErrorAnalysisAlertsInputSchema = z.object({
  errorText: z.string().describe('The full error message, including any stack trace, to be analyzed.'),
  context: z.string().optional().describe('Any additional context about what the user was doing when the error occurred.'),
});
export type ErrorAnalysisAlertsInput = z.infer<typeof ErrorAnalysisAlertsInputSchema>;

const ErrorAnalysisAlertsOutputSchema = z.object({
  probableCause: z.string().describe("A concise explanation of the likely root cause of the error."),
  suggestedSolution: z.string().describe("A step-by-step recommendation on how to fix the error. Provide code snippets if applicable."),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('The estimated severity of the error.'),
});
export type ErrorAnalysisAlertsOutput = z.infer<typeof ErrorAnalysisAlertsOutputSchema>;

export async function errorAnalysisAlerts(input: ErrorAnalysisAlertsInput): Promise<ErrorAnalysisAlertsOutput> {
  return errorAnalysisAlertsFlow(input);
}

const errorAnalysisPrompt = ai.definePrompt({
  name: 'errorAnalysisPrompt',
  input: {schema: ErrorAnalysisAlertsInputSchema},
  output: {schema: ErrorAnalysisAlertsOutputSchema},
  prompt: `You are an expert software developer and debugging specialist. Your task is to analyze an error log and provide a clear, concise, and actionable analysis.

Analyze the following error details:
Error Log: {{{errorText}}}
User Context: {{{context}}}

Based on your analysis, provide the following:
1.  **Probable Cause**: A brief explanation of the most likely reason for this error.
2.  **Suggested Solution**: Actionable steps to resolve the error. If possible, provide corrected code snippets.
3.  **Severity**: Rate the severity of the error on a scale of Low, Medium, High, or Critical.

Your response must be structured precisely according to the output schema.`,
});

const errorAnalysisAlertsFlow = ai.defineFlow(
  {
    name: 'errorAnalysisAlertsFlow',
    inputSchema: ErrorAnalysisAlertsInputSchema,
    outputSchema: ErrorAnalysisAlertsOutputSchema,
  },
  async input => {
    const {output} = await errorAnalysisPrompt(input);
    return output!;
  }
);
