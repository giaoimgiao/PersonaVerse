
// src/ai/flows/refine-persona.ts
'use server';
/**
 * @fileOverview Refines an existing character persona based on user input.
 *
 * - refinePersona - A function that refines the character persona.
 * - RefinePersonaInput - The input type for the refinePersona function.
 * - RefinePersonaOutput - The return type for the refinePersona function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefinePersonaInputSchema = z.object({
  existingPersona: z.string().describe('The existing character persona in JSON format. This may include a "好感等级" field.'),
  refinementRequest: z.string().describe('The user request to refine the persona.'),
});
export type RefinePersonaInput = z.infer<typeof RefinePersonaInputSchema>;

const RefinePersonaOutputSchema = z.string().describe('The refined character persona in JSON format. Ensure to preserve or update the "好感等级" field if present and relevant to the refinement.');
export type RefinePersonaOutput = z.infer<typeof RefinePersonaOutputSchema>;

export async function refinePersona(input: RefinePersonaInput): Promise<RefinePersonaOutput> {
  return refinePersonaFlow(input);
}

const refinePersonaPrompt = ai.definePrompt({
  name: 'refinePersonaPrompt',
  input: {schema: RefinePersonaInputSchema},
  output: {schema: RefinePersonaOutputSchema},
  prompt: `You are an expert character writer. You are provided with an existing character persona in JSON format, and a request from the user to refine the persona.

Existing Persona:
{{{existingPersona}}}

Refinement Request:
{{{refinementRequest}}}

Based on the refinement request, modify the existing persona to create a more focused character that fits the user's story better. 
If the existing persona contains a "好感等级" (favorability level) field, please preserve it unless the refinement request specifically asks to change aspects that would logically alter favorability (e.g., making the character friendlier or more hostile). If "好感等级" is to be changed, ensure it remains a number, typically between 0 and 100.
Respond with the refined persona in JSON format.

Make sure the output is valid JSON.
`, 
});

const refinePersonaFlow = ai.defineFlow(
  {
    name: 'refinePersonaFlow',
    inputSchema: RefinePersonaInputSchema,
    outputSchema: RefinePersonaOutputSchema,
  },
  async input => {
    const {output} = await refinePersonaPrompt(input);
    return output!;
  }
);

