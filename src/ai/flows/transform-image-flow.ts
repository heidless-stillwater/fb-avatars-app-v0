'use server';
/**
 * @fileOverview An image transformation AI agent.
 *
 * - transformImage - A function that handles the image transformation process.
 * - TransformImageInput - The input type for the transformImage function.
 * - TransformImageOutput - The return type for the transformImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TransformImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a room, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  prompt: z.string().describe('The transformation to apply to the image.'),
  testMode: z.boolean().describe('Whether to run in test mode or not.'),
});
export type TransformImageInput = z.infer<typeof TransformImageInputSchema>;

const TransformImageOutputSchema = z.object({
  transformedImageUrl: z
    .string()
    .describe(
      "The transformed image, as a data URI that must include a MIME type and use Base64 encoding."
    ),
});
export type TransformImageOutput = z.infer<typeof TransformImageOutputSchema>;

export async function transformImage(
  input: TransformImageInput
): Promise<TransformImageOutput> {
  return transformImageFlow(input);
}

const transformImageFlow = ai.defineFlow(
  {
    name: 'transformImageFlow',
    inputSchema: TransformImageInputSchema,
    outputSchema: TransformImageOutputSchema,
  },
  async (input) => {
    if (input.testMode) {
      const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `A solid light blue background with the text "${input.prompt}" in the foreground.`,
      });
      return { transformedImageUrl: media.url };
    } else {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image-preview',
        prompt: [
          { media: { url: input.photoDataUri } },
          {
            text: `Assuming the image is of a room in a domestic house, decorate and furnish this room in a style specified by the following prompt: "${input.prompt}"`,
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });
      if (!media) {
        throw new Error('Image generation failed.');
      }
      return { transformedImageUrl: media.url };
    }
  }
);
