
'use server';

/**
 * @fileOverview An AI agent to translate text into a specified language.
 *
 * - bulkTranslateText - A function that handles the translation of multiple texts at once.
 * - BulkTranslateTextInput - The input type for the bulkTranslateText function.
 * - BulkTranslateTextOutput - The return type for the bulkTranslateText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { gemini15Pro } from '@genkit-ai/googleai';

const BulkTranslateTextInputSchema = z.object({
  texts: z.array(z.string()).describe('The text items to be translated.'),
  targetLanguage: z.string().describe('The target language code (e.g., "en" for English, "th" for Thai).'),
});
export type BulkTranslateTextInput = z.infer<typeof BulkTranslateTextInputSchema>;

const BulkTranslateTextOutputSchema = z.object({
  translations: z.array(z.string()).describe('The translated texts, in the same order as the input.'),
});
export type BulkTranslateTextOutput = z.infer<typeof BulkTranslateTextOutputSchema>;

export async function bulkTranslateText(input: BulkTranslateTextInput): Promise<BulkTranslateTextOutput> {
  return translateTextFlow(input);
}

const translationPrompt = ai.definePrompt({
  name: 'bulkTranslationPrompt',
  input: { schema: BulkTranslateTextInputSchema },
  output: { schema: BulkTranslateTextOutputSchema },
  model: gemini15Pro, 
  prompt: `Translate each of the following text items into the language with the code '{{targetLanguage}}'.
Return the translated texts as a JSON array in the same order as the input.

Texts:
{{#each texts}}
- {{{this}}}
{{/each}}
`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'bulkTranslateTextFlow',
    inputSchema: BulkTranslateTextInputSchema,
    outputSchema: BulkTranslateTextOutputSchema,
  },
  async (input) => {
    if (input.texts.length === 0) {
        return { translations: [] };
    }
    const { output } = await translationPrompt(input);
    return output!;
  }
);
