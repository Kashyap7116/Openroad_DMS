'use server';

/**
 * @fileOverview An AI agent to detect document expiry and generate alerts.
 *
 * - generateDocumentExpiryAlerts - A function that handles the document expiry alert generation process.
 * - DocumentExpiryAlertsInput - The input type for the generateDocumentExpiryAlerts function.
 * - DocumentExpiryAlertsOutput - The return type for the generateDocumentExpiryAlerts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DocumentExpiryAlertsInputSchema = z.object({
  documentType: z.string().describe('The type of document to check for expiry (e.g., vehicle registration, employee contract).'),
  expiryDate: z.string().describe('The expiry date of the document in ISO format (YYYY-MM-DD).'),
  documentName: z.string().describe('The name of the document.'),
  ownerName: z.string().describe('The name of document owner.'),
  alertThresholdDays: z.number().describe('The number of days before expiry to trigger an alert.'),
  currentDate: z.string().describe('The current date in ISO format (YYYY-MM-DD).'),
});

export type DocumentExpiryAlertsInput = z.infer<typeof DocumentExpiryAlertsInputSchema>;

const DocumentExpiryAlertsOutputSchema = z.object({
  alertMessage: z.string().describe('The generated alert message if the document is nearing expiry, otherwise null.'),
});

export type DocumentExpiryAlertsOutput = z.infer<typeof DocumentExpiryAlertsOutputSchema>;

export async function generateDocumentExpiryAlerts(input: DocumentExpiryAlertsInput): Promise<DocumentExpiryAlertsOutput> {
  return documentExpiryAlertsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'documentExpiryAlertsPrompt',
  input: {schema: DocumentExpiryAlertsInputSchema},
  output: {schema: DocumentExpiryAlertsOutputSchema},
  prompt: `You are an alert generation specialist focused on notifying users of nearing document expiries.  You are provided with the document's expiry date, the alert threshold in days, the current date, document name, owner name, and the document type.  If the difference between the expiry date and the current date is less than or equal to the alert threshold, generate an alert message.  Otherwise, return an empty alert message.

Document Type: {{{documentType}}}
Document Name: {{{documentName}}}
Owner Name: {{{ownerName}}}
Expiry Date: {{{expiryDate}}}
Alert Threshold (days): {{{alertThresholdDays}}}
Current Date: {{{currentDate}}}
`,
});

const documentExpiryAlertsFlow = ai.defineFlow(
  {
    name: 'documentExpiryAlertsFlow',
    inputSchema: DocumentExpiryAlertsInputSchema,
    outputSchema: DocumentExpiryAlertsOutputSchema,
  },
  async input => {
    const expiryDate = new Date(input.expiryDate);
    const currentDate = new Date(input.currentDate);
    const timeDiff = expiryDate.getTime() - currentDate.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (dayDiff <= input.alertThresholdDays) {
      const {output} = await prompt(input);
      return {alertMessage: `ALERT: ${input.documentType} '${input.documentName}' for ${input.ownerName} is expiring in ${dayDiff} days.`};
    } else {
      return {alertMessage: ''};
    }
  }
);
