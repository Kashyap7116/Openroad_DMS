'use server';

/**
 * @fileOverview An AI agent to process uploaded holiday list files (CSV/Excel) and convert them to structured JSON.
 *
 * - processHolidaysFile - A function that handles the file parsing and conversion.
 * - ProcessHolidaysFileInput - The input type for the processHolidaysFile function.
 * - ProcessHolidaysFileOutput - The return type for the processHolidaysFile function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Defines the structure for a single holiday record
const HolidayRecordSchema = z.object({
  date: z.string().describe('The date of the holiday in YYYY-MM-DD format.'),
  name: z.string().describe('The name of the holiday.'),
});
export type HolidayRecord = z.infer<typeof HolidayRecordSchema>;

const ProcessHolidaysFileInputSchema = z.object({
  fileDataUri: z.string().describe("The content of the holidays file (CSV or Excel) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ProcessHolidaysFileInput = z.infer<typeof ProcessHolidaysFileInputSchema>;

// The output will be an array of these records
const ProcessHolidaysFileOutputSchema = z.array(HolidayRecordSchema);
export type ProcessHolidaysFileOutput = z.infer<typeof ProcessHolidaysFileOutputSchema>;


export async function processHolidaysFile(input: ProcessHolidaysFileInput): Promise<ProcessHolidaysFileOutput> {
  return processHolidaysFileFlow(input);
}

const processingPrompt = ai.definePrompt({
  name: 'processHolidaysFilePrompt',
  input: { schema: ProcessHolidaysFileInputSchema },
  output: { schema: ProcessHolidaysFileOutputSchema },
  prompt: `You are an expert data processing agent. Your task is to analyze the content of an uploaded file (CSV or text from Excel) containing a list of holidays and convert it into a structured JSON array.

You will be provided with the file content as a data URI.

Instructions:
1.  Analyze the file content to identify columns for 'date' and 'name'. The column names might vary (e.g., "Holiday Date", "Event Name"), so use your intelligence to map them correctly.
2.  For each row representing a holiday, create a JSON object that strictly follows this schema:
    - date (string, format as YYYY-MM-DD)
    - name (string)
3.  Return a valid JSON array of these records. The entire file should be processed.

File Content:
{{media url=fileDataUri}}
`,
});

const processHolidaysFileFlow = ai.defineFlow(
  {
    name: 'processHolidaysFileFlow',
    inputSchema: ProcessHolidaysFileInputSchema,
    outputSchema: ProcessHolidaysFileOutputSchema,
  },
  async input => {
    const { output } = await processingPrompt(input);
    if (!output) {
      throw new Error('Failed to process the holidays file. The AI model did not return any output.');
    }
    return output;
  }
);
