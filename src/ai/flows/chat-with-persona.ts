
'use server';
/**
 * @fileOverview Handles chat interactions with a persona.
 *
 * - chatWithPersona - A function that processes user messages and generates AI responses.
 * - ChatWithPersonaInput - The input type for the chatWithPersona function.
 * - ChatWithPersonaOutput - The return type for the chatWithPersona function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { PersonaData, ChatSettings, MemoryKeyword as AppMemoryKeyword, SafetySettingItem, RolePlaySettings, ChatMessage as AppChatMessage } from '@/types';
import { DEFAULT_SAFETY_SETTINGS } from '@/lib/constants';

// Internal Zod schemas, not exported from 'use server' file
const PersonaDataSchemaInternal = z.custom<PersonaData>();

const SafetySettingItemSchemaInternal = z.object({ 
  category: z.string(),
  threshold: z.string(),
});

const ChatSettingsSchemaInternal = z.object({ 
  temperature: z.number().min(0).max(1).optional(),
  maxLength: z.number().min(1).max(8192).optional(),
  safetySettings: z.array(SafetySettingItemSchemaInternal).optional(),
}).optional();


const MemoryKeywordSchemaInternal = z.object({ 
  id: z.string(),
  term: z.string(),
  details: z.string(),
  personaId: z.string().optional(),
  enabled: z.boolean(),
  triggerSource: z.enum(['user', 'ai', 'both']),
  activationScope: z.enum(['currentTurn', 'history']),
  priority: z.number(),
});

const RolePlaySettingsSchemaInternal = z.object({
  userGender: z.enum(['男', '女', '其他', 'unspecified', '']).optional(),
  userRelationship: z.string().optional(),
  userTemporaryName: z.string().optional(),
  visualNovelPrompt: z.string().optional(),
}).optional();

// Schema for chat messages within the history, including optional imageUrl
const ChatMessageSchemaInternal = z.object({
  role: z.enum(['user', 'model', 'system']),
  content: z.string(),
  imageUrl: z.string().optional(), // Base64 Data URL for images in history
});

const ChatWithPersonaInputSchema = z.object({
  persona: PersonaDataSchemaInternal.describe('The character persona data.'),
  chatHistory: z.array(ChatMessageSchemaInternal).describe('The history of the conversation so far (user and model roles only).'),
  userMessage: z.string().describe('The latest text message from the user.'),
  userImage: z.string().optional().describe('Optional Base64 Data URL of the image sent by the user in the current turn.'),
  chatSettings: ChatSettingsSchemaInternal.describe('Optional settings for the AI model, like temperature and safety settings.'),
  activeKeywords: z.array(MemoryKeywordSchemaInternal).optional().describe('Active keywords and their details to guide the AI.'),
  userName: z.string().optional().describe('The name of the user interacting with the persona.'),
  rolePlaySettings: RolePlaySettingsSchemaInternal.describe('Optional role-play settings.'),
});
export type ChatWithPersonaInput = z.infer<typeof ChatWithPersonaInputSchema>;


// Schema for the direct output expected from the AI model
const AIModelOutputSchema = z.object({
  aiResponse: z.string().describe('The AI-generated response text, potentially including dialogue and <灰字> style descriptions.'),
  好感等级: z.number().min(0).max(100).describe('The updated favorability level (0-100) of the persona after this interaction.'),
});

// Schema for the output of the chatWithPersonaFlow itself
const ChatWithPersonaOutputSchema = z.object({
  aiResponse: z.string().describe('The AI-generated response text.'),
  好感等级: z.number().min(0).max(100).describe("The persona's favorability level (0-100). This will be the original value if AI failed to update it, or the new value if successful."),
  好感等级更新成功: z.boolean().optional().describe('True if the AI successfully provided an updated favorability level for this turn.'),
});
export type ChatWithPersonaOutput = z.infer<typeof ChatWithPersonaOutputSchema>;


export async function chatWithPersona(input: ChatWithPersonaInput): Promise<ChatWithPersonaOutput> {
  return chatWithPersonaFlow(input);
}

// System prompt as a Handlebars template
const personaSystemPrompt = `You are an AI role-playing as {{persona.人设名称}}.
Your responses should be consistent with this persona's traits, background, and speaking style.
Engage with the user naturally based on their messages and the ongoing conversation.

The user's name is "{{#if rolePlaySettings.userTemporaryName}}{{rolePlaySettings.userTemporaryName}}{{else}}{{#if userName}}{{userName}}{{else}}尊贵的用户{{/if}}{{/if}}". Refer to them as such or by a nickname if the persona would.
{{#if rolePlaySettings.userGender}}The user's chosen gender for this interaction is: {{rolePlaySettings.userGender}}.{{/if}}
{{#if rolePlaySettings.userRelationship}}The user describes their relationship to you or your world as: "{{rolePlaySettings.userRelationship}}".{{/if}}

The persona's current "好感等级" (favorability level) towards the user is {{persona.好感等级}} out of 100.
Based on the user's current message and the overall tone of the conversation, you MUST adjust this "好感等级".
- If the interaction is positive, increase the "好感等级".
- If the interaction is negative, decrease the "好感等级".
- If neutral, it may remain similar or change slightly.
The "好感等级" must be an integer between 0 and 100.

The persona details are:
Name: {{persona.人设名称}}
Age: {{persona.年龄}}
Identity: {{persona.身份}}
Personality Traits (Anchor A): {{#each persona.性格锚点A.性格特点}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} (Reference Model: {{persona.性格锚点A.性格参考模型}})
Personality Model (Anchor B): {{persona.性格锚点B.性格模型}} (Changes: {{persona.性格锚点B.性格变化}})
Speaking Style: {{#each persona.说话风格}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Likes: {{#each persona.喜好.事物}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Dislikes: {{#each persona.喜好.厌恶}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

{{#if activeKeywords.length}}
Key Information to Consider (Active Keywords):
The user has provided the following keywords and associated details. If the current conversation (especially the user's latest message or relevant history) touches upon any of these keywords, try to naturally incorporate or be influenced by the 'Details' provided for that keyword. Adapt this information to fit your persona and the conversational flow. Do not simply regurgitate the details.
{{#each activeKeywords}}
- Keyword: "{{this.term}}"
  Details: "{{this.details}}"
  (This keyword is intended to be triggered by: {{this.triggerSource}}; relevant if mentioned in: {{this.activationScope}})
{{/each}}
{{/if}}

Visual Novel Style Descriptions ("镜头语言"):
In addition to your dialogue as {{persona.人设名称}}, you should also generate descriptive, third-person "镜头语言" (cinematic language) passages to enhance the visual novel experience, when appropriate.
{{#if rolePlaySettings.visualNovelPrompt}}
Follow these specific instructions for "镜头语言":
"{{{rolePlaySettings.visualNovelPrompt}}}"
These descriptive passages should be formatted like this: <灰字>：(Your description here)
The {{char}} placeholder refers to "{{persona.人设名称}}", and {{user}} placeholder refers to "{{#if rolePlaySettings.userTemporaryName}}{{rolePlaySettings.userTemporaryName}}{{else}}{{#if userName}}{{userName}}{{else}}尊贵的用户{{/if}}{{/if}}".
{{else}}
(Default "镜头语言" instructions: These descriptive passages should be detailed, focusing on {{persona.人设名称}}'s expressions, actions, appearance, and the environment. Format them like this: <灰字>：(Your description here))
{{/if}}
Ensure these descriptive parts are woven naturally with your dialogue.

Your response MUST be a valid JSON object with exactly two fields:
1. "aiResponse": Your conversational reply as a plain text string. This string can contain both dialogue from {{persona.人设名称}} and the <灰字> formatted descriptive passages.
2. "好感等级": The new, updated favorability level (an integer between 0 and 100) for {{persona.人设名称}} towards "{{#if rolePlaySettings.userTemporaryName}}{{rolePlaySettings.userTemporaryName}}{{else}}{{#if userName}}{{userName}}{{else}}尊贵的用户{{/if}}{{/if}}" after this interaction.

Example of expected JSON output:
{
  "aiResponse": "角色对话... <灰字>：(场景或动作描述...)",
  "好感等级": 65
}

Do NOT add any other explanations or commentary outside of this JSON structure.
---
Conversation History:
{{#each chatHistoryToRender}}
{{this.prefix}}{{#if this.content}}{{this.content}}{{/if}}{{#if this.imageUrl}}{{media url=this.imageUrl}}{{/if}}
{{/each}}
---
{{userNameOrDefault}}: {{userMessage}}{{#if userImage}}{{media url=userImage}}{{/if}}
{{persona.人设名称}}:`;


// Define the prompt object with input, output, prompt string, and config function
const chatWithPersonaSystemPromptObject = ai.definePrompt({
  name: 'chatWithPersonaSystemPrompt',
  inputSchema: ChatWithPersonaInputSchema, // Use the full input schema that includes userImage
  output: {schema: AIModelOutputSchema}, 
  prompt: personaSystemPrompt,
  config: (input: ChatWithPersonaInput): Record<string, any> => {
    const modelConfig: Record<string, any> = {};

    modelConfig.safetySettings = DEFAULT_SAFETY_SETTINGS.map(s => ({
      category: s.category,
      threshold: s.threshold,
    }));

    if (input.chatSettings?.safetySettings && input.chatSettings.safetySettings.length > 0) {
      const userSafetySettingsMap = new Map(input.chatSettings.safetySettings.map(s => [s.category, s.threshold]));
      modelConfig.safetySettings = modelConfig.safetySettings.map((defaultSetting: SafetySettingItem) => ({
        category: defaultSetting.category,
        threshold: userSafetySettingsMap.get(defaultSetting.category) || defaultSetting.threshold,
      }));
      input.chatSettings.safetySettings.forEach(userSetting => {
        if (!modelConfig.safetySettings.find((s: SafetySettingItem) => s.category === userSetting.category)) {
          modelConfig.safetySettings.push({ category: userSetting.category, threshold: userSetting.threshold });
        }
      });
    }
    
    if (input.chatSettings?.temperature) {
      modelConfig.temperature = input.chatSettings.temperature;
    }
    if (input.chatSettings?.maxLength) {
      modelConfig.maxOutputTokens = Math.floor(input.chatSettings.maxLength);
    }
    return modelConfig;
  },
});


const chatWithPersonaFlow = ai.defineFlow(
  {
    name: 'chatWithPersonaFlow',
    inputSchema: ChatWithPersonaInputSchema,
    outputSchema: ChatWithPersonaOutputSchema, 
  },
  async (input: ChatWithPersonaInput): Promise<ChatWithPersonaOutput> => {
    const personaName = input.persona?.["人设名称"] || "角色";
    console.log("Chat flow input (original):", JSON.stringify(input, {depth: null, colors: true} as any));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { avatarImage, id, ...personaForPrompt } = input.persona;
    
    const effectiveUserName = input.rolePlaySettings?.userTemporaryName || input.userName || "尊贵的用户";

    // Pre-process chat history for Handlebars rendering, including imageUrl
    const chatHistoryToRender = input.chatHistory
      .filter(msg => (msg.role === 'user' || msg.role === 'model') && (msg.content.trim() !== '' || msg.imageUrl))
      .map(msg => {
        let prefix = "";
        if (msg.role === 'user') prefix = `${effectiveUserName}: `;
        else if (msg.role === 'model') prefix = `${personaForPrompt.人设名称 || 'AI'}: `;
        return { 
          prefix, 
          content: msg.content.trim(), 
          imageUrl: msg.imageUrl // Pass imageUrl to Handlebars context
        };
      });

    const inputForPrompt = {
      ...input, // This already includes userMessage and userImage
      persona: personaForPrompt,
      chatHistoryToRender: chatHistoryToRender,
      userNameOrDefault: effectiveUserName,
    };
    
    console.log("Input being sent to chatWithPersonaSystemPromptObject:", JSON.stringify(inputForPrompt, {depth: null, colors: true} as any));

    try {
      // Directly call the prompt object with the prepared input
      const {output: aiModelOutput, usage} = await chatWithPersonaSystemPromptObject(inputForPrompt);

      console.log("Full llmResponse (aiModelOutput) from chatWithPersonaSystemPromptObject:", JSON.stringify(aiModelOutput, {depth: null, colors: true} as any));
      console.log("Token usage from chatWithPersonaSystemPromptObject:", JSON.stringify(usage, {depth: null, colors: true} as any));

      if (aiModelOutput && typeof aiModelOutput.aiResponse === 'string' && typeof aiModelOutput.好感等级 === 'number') {
        return { 
          aiResponse: aiModelOutput.aiResponse.trim(), 
          好感等级: aiModelOutput.好感等级,
          好感等级更新成功: true 
        };
      } else {
        console.error("AI response missing required fields or incorrect types. aiModelOutput:", JSON.stringify(aiModelOutput, {depth: null, colors: true} as any));
        
        let errorMessage = `${personaName} 返回的数据格式不正确，缺少 aiResponse 或 好感等级。`;
        let finishReason = (aiModelOutput as any)?.candidates?.[0]?.finishReason || (aiModelOutput as any)?.finishReason; 
        if (finishReason) {
            if (finishReason === 'SAFETY') {
                errorMessage = `${personaName} 觉得这个话题 (${finishReason}) 不太合适，想换一个。`;
                 const safetyRatings = (aiModelOutput as any)?.candidates?.[0]?.safetyRatings;
                 if (safetyRatings) {
                    errorMessage += ` 具体原因: ${JSON.stringify(safetyRatings)}`;
                 }
            } else if (finishReason === 'MAX_TOKENS') {
                errorMessage = `${personaName} 说了好多话，有点说不完了，要不我们下次再聊这个部分？`;
            } else if (finishReason !== 'STOP') { 
                 errorMessage = `${personaName} 遇到了一点小问题 (原因: ${finishReason || '未知'})，请稍后再试。`;
            }
        }
        return { 
          aiResponse: errorMessage, 
          好感等级: input.persona.好感等级, 
          好感等级更新成功: false
        };
      }
    } catch (error: any) {
        console.error("CRITICAL ERROR in chatWithPersonaFlow when calling chatWithPersonaSystemPromptObject:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        let detail = error.message || "未知错误";
        let userGuidance = "请检查 Genkit 终端日志获取详细错误信息。";

        if (typeof detail === 'string') {
            if (detail.includes("Unsupported Part type")) { 
                detail = `内部错误: 模型无法处理输入的消息格式 (Unsupported Part type). 这通常是 Genkit 插件或模型配置问题。`;
                userGuidance = `这个问题可能与 Genkit 插件或模型配置有关。请将 Genkit 终端中 "CRITICAL ERROR" 下方的详细错误信息提供给开发人员。`;
            } else if (detail.includes("Text not found") || detail.toLowerCase().includes("text is not a function")) {
                detail = `内部错误: 模型响应中未找到预期的文本内容。可能是因为移除了output schema后，模型未按纯文本返回。`;
                userGuidance = `请检查Genkit终端日志中的 "Full llmResponse (aiModelOutput) from chatWithPersonaSystemPromptObject" 输出。`;
            } else if (detail.includes("API key not valid")) {
                detail = `API 密钥无效或未正确配置。`;
                userGuidance = `请检查您的 Google AI API 密钥是否正确设置在环境变量中，并且 Genkit 已正确加载。`;
            } else if (error.cause && (error.cause as any).message && (error.cause as any).message.includes("Could not parse output")) {
                detail = `模型未能按要求的JSON格式返回数据。可能是提示词需要调整，或者模型回复的内容无法构造成JSON。`;
                userGuidance = `请检查Genkit终端日志中的 "Full llmResponse (aiModelOutput) from chatWithPersonaSystemPromptObject" 输出，查看模型实际返回的内容。`;
            }
        }
        
        if (error.details) { 
            detail += ` (${error.details})`;
        }
        
        const errorResponse = (error as any).response || (error as any).cause?.response;
        if (errorResponse?.data?.error?.message) {
            detail += ` | API Error: ${errorResponse.data.error.message}`;
        }

        return { 
          aiResponse: `${personaName} 思考的时候遇到了一点小麻烦。详情: ${detail} ${userGuidance}`, 
          好感等级: input.persona.好感等级, 
          好感等级更新成功: false
        };
    }
  }
);
