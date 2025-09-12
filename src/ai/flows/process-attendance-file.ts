
'use server';

/**
 * @fileOverview An AI agent to process uploaded attendance files (CSV/Excel) and convert them to structured JSON.
 *
 * - processAttendanceFile - A function that handles the file parsing and conversion.
 * - ProcessAttendanceFileInput - The input type for the processAttendanceFile function.
 * - ProcessAttendanceFileOutput - The return type for the processAttendanceFile function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Defines the structure for a single attendance record
const AttendanceRecordSchema = z.object({
  employee_id: z.string().describe('The unique identifier for the employee.'),
  name: z.string().describe('The full name of the employee.'),
  date: z.string().describe('The date of the record in YYYY-MM-DD format.'),
  status: z.enum(['Present', 'Late', 'Absent', 'Leave']).describe('The attendance status.'),
  in_time: z.string().describe('The check-in time in HH:MM format. Should be empty if status is Absent or Leave.'),
  out_time: z.string().describe('The check-out time in HH:MM format. Should be empty if status is Absent or Leave.'),
  remarks: z.string().optional().describe('Any additional remarks or comments. This field should be included even if empty.'),
});
export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;

const ProcessAttendanceFileInputSchema = z.object({
  fileDataUri: z.string().describe("The content of the attendance file (CSV or Excel) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ProcessAttendanceFileInput = z.infer<typeof ProcessAttendanceFileInputSchema>;

// The output will be an array of these records
const ProcessAttendanceFileOutputSchema = z.object({
    month: z.number().describe('The primary month of the attendance period (e.g., for Aug 21-Sep 20, the month is 9 for September).'),
    year: z.number().describe('The year of the primary month.'),
    records: z.array(AttendanceRecordSchema)
});
export type ProcessAttendanceFileOutput = z.infer<typeof ProcessAttendanceFileOutputSchema>;


export async function processAttendanceFile(input: ProcessAttendanceFileInput): Promise<ProcessAttendanceFileOutput> {
  return processAttendanceFileFlow(input);
}

const processingPrompt = ai.definePrompt({
  name: 'processAttendanceFilePrompt',
  input: { schema: ProcessAttendanceFileInputSchema },
  output: { schema: ProcessAttendanceFileOutputSchema },
  prompt: `You are an expert data processing agent. Your task is to analyze the content of an uploaded file (CSV or text from Excel) and convert it into a structured JSON array of employee attendance records. The attendance period runs from the 21st of one month to the 20th of the next.

You will be provided with the file content as a data URI.

Instructions:
1.  Analyze the file content to identify the dates of the records. Determine the primary month for the attendance cycle. The "month" is defined by the end date of the cycle. For example, a cycle from August 21st to September 20th belongs to September (month 9).
2.  Identify columns for employee ID, name, date, status, in-time, out-time, and remarks. The column names may not be exact, so use your intelligence to map them correctly. The 'remarks' column is very important; capture it if it exists.
3.  For each row, create a JSON object that strictly follows this schema for the 'records' array:
    - employee_id (string)
    - name (string)
    - date (string, format as YYYY-MM-DD)
    - status (enum: 'Present', 'Late', 'Absent', 'Leave')
    - in_time (string, format as HH:MM, or empty string "" if not applicable)
    - out_time (string, format as HH:MM, or empty string "" if not applicable)
    - remarks (string, optional, include this field even if it's just an empty string)
4.  Return a single JSON object containing the determined month, year, and the array of all processed records.

File Content:
{{media url=fileDataUri}}
`,
});

const processAttendanceFileFlow = ai.defineFlow(
  {
    name: 'processAttendanceFileFlow',
    inputSchema: ProcessAttendanceFileInputSchema,
    outputSchema: ProcessAttendanceFileOutputSchema,
  },
  async input => {
    const { output } = await processingPrompt(input);
    if (!output) {
      throw new Error('Failed to process the attendance file. The AI model did not return any output.');
    }
    return output;
  }
);
