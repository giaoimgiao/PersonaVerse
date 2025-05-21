
'use server';
/**
 * @fileOverview Connectivity testing flows for various AI providers.
 *
 * - testGeminiModelConnectivity
 * - testOpenAIModelConnectivity
 * - testClaudeModelConnectivity
 * - testCustomOpenAIModelConnectivity
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Output schema for all test flows
const TestConnectivityOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type TestConnectivityOutput = z.infer<typeof TestConnectivityOutputSchema>;

// --- Gemini Test Flow ---
const TestGeminiInputSchema = z.object({
  modelName: z.string().min(1, "Gemini模型名称不能为空"),
});
export type TestGeminiInput = z.infer<typeof TestGeminiInputSchema>;

export async function testGeminiModelConnectivity(input: TestGeminiInput): Promise<TestConnectivityOutput> {
  return testGeminiModelConnectivityFlow(input);
}

const testGeminiModelConnectivityFlow = ai.defineFlow(
  {
    name: 'testGeminiModelConnectivityFlow',
    inputSchema: TestGeminiInputSchema,
    outputSchema: TestConnectivityOutputSchema,
  },
  async ({ modelName }) => {
    try {
      // The global 'ai' instance uses GOOGLE_API_KEY from env for authentication.
      // We are primarily testing if the modelName is valid and reachable.
      const fullModelName = modelName.startsWith('models/') ? modelName : `googleai/${modelName}`;
      const response = await ai.generate({
        model: fullModelName as any, // Cast to any if Genkit's type for model is too restrictive for dynamic names
        prompt: "Say 'Hello Test Integration'.",
        config: { temperature: 0.1 } // Minimal config
      });
      if (response.text) {
        return { success: true, message: `Gemini 模型 (${modelName}) 连接成功: ${response.text.substring(0,50)}...` };
      }
      return { success: false, message: `Gemini 模型 (${modelName}) 测试成功，但未返回文本。` };
    } catch (error: any) {
      console.error("Gemini test error:", error);
      return { success: false, message: `Gemini 模型 (${modelName}) 测试失败: ${error.message || '未知错误'}` };
    }
  }
);

// --- OpenAI Test Flow ---
const TestOpenAIInputSchema = z.object({
  apiKey: z.string().min(1, "OpenAI API 密钥不能为空"),
  modelName: z.string().min(1, "OpenAI 模型名称不能为空"),
});
export type TestOpenAIInput = z.infer<typeof TestOpenAIInputSchema>;

export async function testOpenAIModelConnectivity(input: TestOpenAIInput): Promise<TestConnectivityOutput> {
  return testOpenAIModelConnectivityFlow(input);
}

const testOpenAIModelConnectivityFlow = ai.defineFlow(
  {
    name: 'testOpenAIModelConnectivityFlow',
    inputSchema: TestOpenAIInputSchema,
    outputSchema: TestConnectivityOutputSchema,
  },
  async ({ apiKey, modelName }) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: "Say 'Hello Test Integration'." }],
          max_tokens: 10,
        }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }
      
      const message = data.choices?.[0]?.message?.content;
      if (message) {
        return { success: true, message: `OpenAI 模型 (${modelName}) 连接成功: ${message.substring(0,50)}...` };
      }
      return { success: false, message: `OpenAI 模型 (${modelName}) 测试成功，但未返回消息。` };
    } catch (error: any) {
      console.error("OpenAI test error:", error);
      return { success: false, message: `OpenAI 模型 (${modelName}) 测试失败: ${error.message || '未知错误'}` };
    }
  }
);

// --- Claude Test Flow ---
const TestClaudeInputSchema = z.object({
  apiKey: z.string().min(1, "Claude API 密钥不能为空"),
  modelName: z.string().min(1, "Claude 模型名称不能为空"),
});
export type TestClaudeInput = z.infer<typeof TestClaudeInputSchema>;

export async function testClaudeModelConnectivity(input: TestClaudeInput): Promise<TestConnectivityOutput> {
  return testClaudeModelConnectivityFlow(input);
}

const testClaudeModelConnectivityFlow = ai.defineFlow(
  {
    name: 'testClaudeModelConnectivityFlow',
    inputSchema: TestClaudeInputSchema,
    outputSchema: TestConnectivityOutputSchema,
  },
  async ({ apiKey, modelName }) => {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: "Say 'Hello Test Integration'." }],
          max_tokens: 10,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }
      
      const message = data.content?.[0]?.text;
      if (message) {
        return { success: true, message: `Claude 模型 (${modelName}) 连接成功: ${message.substring(0,50)}...` };
      }
      return { success: false, message: `Claude 模型 (${modelName}) 测试成功，但未返回消息。` };
    } catch (error: any) {
      console.error("Claude test error:", error);
      return { success: false, message: `Claude 模型 (${modelName}) 测试失败: ${error.message || '未知错误'}` };
    }
  }
);

// --- Custom OpenAI-compatible Test Flow ---
const TestCustomOpenAIInputSchema = z.object({
  baseUrl: z.string().url("请输入有效的自定义端点基础 URL"),
  modelName: z.string().min(1, "自定义模型名称不能为空"),
  apiKey: z.string().optional(),
});
export type TestCustomOpenAIInput = z.infer<typeof TestCustomOpenAIInputSchema>;

export async function testCustomOpenAIModelConnectivity(input: TestCustomOpenAIInput): Promise<TestConnectivityOutput> {
  return testCustomOpenAIModelConnectivityFlow(input);
}

const testCustomOpenAIModelConnectivityFlow = ai.defineFlow(
  {
    name: 'testCustomOpenAIModelConnectivityFlow',
    inputSchema: TestCustomOpenAIInputSchema,
    outputSchema: TestConnectivityOutputSchema,
  },
  async ({ baseUrl, modelName, apiKey }) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { // Ensure no trailing slash in baseUrl before adding path
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: "Say 'Hello Test Integration'." }],
          max_tokens: 10,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }

      const message = data.choices?.[0]?.message?.content;
      if (message) {
        return { success: true, message: `自定义端点模型 (${modelName}) 连接成功: ${message.substring(0,50)}...` };
      }
      return { success: false, message: `自定义端点模型 (${modelName}) 测试成功，但未返回消息。` };
    } catch (error: any) {
      console.error("Custom OpenAI test error:", error);
      return { success: false, message: `自定义端点模型 (${modelName}) 测试失败: ${error.message || '未知错误'}` };
    }
  }
);
