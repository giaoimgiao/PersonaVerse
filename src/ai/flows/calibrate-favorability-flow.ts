
'use server';
/**
 * @fileOverview AI flow to calibrate a persona's favorability score.
 *
 * - calibrateFavorability - Function to trigger favorability calibration.
 * - CalibrateFavorabilityInput - Input type for the calibration flow.
 * - CalibrateFavorabilityOutput - Output type for the calibration flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { PersonaData, ChatMessage as AppChatMessage } from '@/types'; // Using AppChatMessage to avoid conflict

// Internal Zod schemas, not exported from 'use server' file
const PersonaDataSchemaInternal = z.custom<PersonaData>();

const ChatMessageSchemaInternal = z.object({
  role: z.enum(['user', 'model', 'system']),
  content: z.string(),
});

const CalibrateFavorabilityInputSchema = z.object({
  persona: PersonaDataSchemaInternal.describe('The character persona data (cleaned, without avatar/id).'),
  chatHistory: z.array(ChatMessageSchemaInternal).describe('Recent chat history (user and model roles only).'),
  currentFavorability: z.number().min(0).max(100).describe('The current (potentially stuck) favorability score.'),
  userName: z.string().optional().describe('The name of the user interacting with the persona.'),
  userLastMessage: z.string().optional().describe('The last message sent by the user in the main chat, for context.')
});
export type CalibrateFavorabilityInput = z.infer<typeof CalibrateFavorabilityInputSchema>;

const CalibrateFavorabilityOutputSchema = z.object({
  newFavorability: z.number().min(0).max(100).describe('The recalibrated favorability score.'),
});
export type CalibrateFavorabilityOutput = z.infer<typeof CalibrateFavorabilityOutputSchema>;

export async function calibrateFavorability(input: CalibrateFavorabilityInput): Promise<CalibrateFavorabilityOutput> {
  return calibrateFavorabilityFlow(input);
}

const calibrationPromptText = `You are an AI assistant tasked with calibrating a character's '好感等级' (favorability score, 0-100).
The character's details are:
Name: {{persona.人设名称}}
Age: {{persona.年龄}}
Identity: {{persona.身份}}
Personality Traits (Anchor A): {{#each persona.性格锚点A.性格特点}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} (Reference Model: {{persona.性格锚点A.性格参考模型}})
Personality Model (Anchor B): {{persona.性格锚点B.性格模型}} (Changes: {{persona.性格锚点B.性格变化}})
Speaking Style: {{#each persona.说话风格}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Likes: {{#each persona.喜好.事物}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Dislikes: {{#each persona.喜好.厌恶}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

The user's name is "{{#if userName}}{{userName}}{{else}}尊贵的用户{{/if}}".
The character's current '好感等级' towards the user is {{currentFavorability}}. This score seems to have been static or inaccurately reported recently, and needs re-evaluation.

Based on the following recent conversation history:
{{#each chatHistoryToRender}}
{{this.prefix}}{{this.content}}
{{/each}}

And the user's latest message in the main chat (which led to this calibration check):
{{#if userLastMessage}}{{userNameOrDefault}}: {{userLastMessage}}{{else}}(No specific last user message provided for this calibration context){{/if}}

Please re-evaluate and provide a new '好感等级' for the character ({{persona.人设名称}}) towards {{userNameOrDefault}}.
This new score should be an integer between 0 and 100.
Your response MUST be a valid JSON object with a single field: "newFavorability".

Example of expected JSON output:
{
  "newFavorability": 65
}

Do NOT add any other explanations or commentary outside of this JSON structure.
`;

const calibrateFavorabilityPrompt = ai.definePrompt({
  name: 'calibrateFavorabilityPrompt',
  input: { schema: CalibrateFavorabilityInputSchema },
  output: { schema: CalibrateFavorabilityOutputSchema },
  prompt: calibrationPromptText,
  config: { // Default config, can be overridden if needed
    temperature: 0.5, // Calibration might need to be less creative, more deterministic
  },
});

const calibrateFavorabilityFlow = ai.defineFlow(
  {
    name: 'calibrateFavorabilityFlow',
    inputSchema: CalibrateFavorabilityInputSchema,
    outputSchema: CalibrateFavorabilityOutputSchema,
  },
  async (input: CalibrateFavorabilityInput): Promise<CalibrateFavorabilityOutput> => {
    console.log("Calibration Flow Input:", JSON.stringify(input, null, 2));

    const chatHistoryToRender = input.chatHistory
      .filter(msg => (msg.role === 'user' || msg.role === 'model') && msg.content.trim() !== '')
      .map(msg => {
        let prefix = "";
        if (msg.role === 'user') prefix = `${input.userName || 'User'}: `;
        else if (msg.role === 'model') prefix = `${input.persona?.人设名称 || 'AI'}: `;
        return { prefix, content: msg.content.trim() };
      });
    
    const userNameOrDefault = input.userName || "尊贵的用户";

    const inputForPrompt = {
      ...input,
      chatHistoryToRender,
      userNameOrDefault,
    };

    try {
      const {output: calibrationResult, usage} = await calibrateFavorabilityPrompt(inputForPrompt);
      console.log("Calibration Flow - AI Response:", JSON.stringify(calibrationResult, null, 2));
      console.log("Calibration Flow - Token Usage:", JSON.stringify(usage, null, 2));

      if (calibrationResult && typeof calibrationResult.newFavorability === 'number') {
        return { newFavorability: calibrationResult.newFavorability };
      } else {
        console.error("Calibration Flow: AI response missing newFavorability or incorrect type. Result:", calibrationResult);
        // Fallback: return current favorability to indicate no change from calibration
        return { newFavorability: input.currentFavorability };
      }
    } catch (error: any) {
      console.error("CRITICAL ERROR in calibrateFavorabilityFlow:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      // Fallback: return current favorability to indicate no change from calibration
      return { newFavorability: input.currentFavorability };
    }
  }
);
