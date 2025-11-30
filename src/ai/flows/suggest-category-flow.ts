'use server';
/**
 * @fileOverview An image categorization AI agent.
 *
 * - suggestCategory - A function that suggests a category for an image.
 * - SuggestCategoryInput - The input type for the suggestCategory function.
 * - SuggestCategoryOutput - The return type for the suggestCategory function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestCategoryInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be categorized, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SuggestCategoryInput = z.infer<typeof SuggestCategoryInputSchema>;

const SuggestCategoryOutputSchema = z.object({
  category: z
    .string()
    .describe(
      'A single, concise category for the image. Should be a noun or short phrase (e.g., "Portrait", "Fantasy Character", "Landscape", "Sci-Fi Armor").'
    ),
});
export type SuggestCategoryOutput = z.infer<typeof SuggestCategoryOutputSchema>;

export async function suggestCategory(
  input: SuggestCategoryInput
): Promise<SuggestCategoryOutput> {
  return suggestCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCategoryPrompt',
  input: { schema: SuggestCategoryInputSchema },
  output: { schema: SuggestCategoryOutputSchema },
  prompt: `You are an expert at image analysis and categorization. Your task is to provide a single, concise category for the given image.

The category should be a simple noun or a short, descriptive phrase. Examples: "Portrait", "Fantasy Character", "Landscape", "Sci-Fi Armor", "Abstract Art", "Animal".

Do not provide a description, just the category name.

Image: {{media url=photoDataUri}}`,
});

const suggestCategoryFlow = ai.defineFlow(
  {
    name: 'suggestCategoryFlow',
    inputSchema: SuggestCategoryInputSchema,
    outputSchema: SuggestCategoryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
