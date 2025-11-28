'use server';
/**
 * @fileOverview An avatar generation AI agent.
 *
 * - generateAvatar - A function that handles the avatar image generation process.
 * - GenerateAvatarInput - The input type for the generateAvatar function.
 * - GenerateAvatarOutput - The return type for the generateAvatar function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAvatarInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate the avatar image from.'),
});
export type GenerateAvatarInput = z.infer<typeof GenerateAvatarInputSchema>;

const GenerateAvatarOutputSchema = z.object({
  avatarImageUrl: z
    .string()
    .describe(
      'The generated avatar image, as a data URI that must include a MIME type and use Base64 encoding.'
    ),
});
export type GenerateAvatarOutput = z.infer<typeof GenerateAvatarOutputSchema>;

export async function generateAvatar(
  input: GenerateAvatarInput
): Promise<GenerateAvatarOutput> {
  return generateAvatarFlow(input);
}

const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Generate a user avatar based on the following description: "${input.prompt}". The image should be a close-up portrait, suitable for a profile picture.`,
    });
    if (!media) {
      throw new Error('Image generation failed.');
    }
    return { avatarImageUrl: media.url };
  }
);
