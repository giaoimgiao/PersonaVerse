
"use client";

import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from '@/hooks/useLocalStorage';
import type { ApiSettings } from '@/types';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import {
  testGeminiModelConnectivity,
  testOpenAIModelConnectivity,
  testClaudeModelConnectivity,
  testCustomOpenAIModelConnectivity
} from '@/ai/flows/test-connectivity'; // We will create this file

const formSchema = z.object({
  openaiApiKey: z.string().optional(),
  openaiModelName: z.string().optional().describe("例如：gpt-4, gpt-3.5-turbo"),
  claudeApiKey: z.string().optional(),
  claudeModelName: z.string().optional().describe("例如：claude-3-opus-20240229, claude-2.1"),
  geminiApiKey: z.string().optional(), // Primarily for user reference or direct API calls
  geminiModelName: z.string().optional().describe("例如：gemini-1.5-pro-latest, gemini-1.0-pro"),
  customOpenAiBaseUrl: z.string().url().optional().or(z.literal('')),
  customOpenAiModelName: z.string().optional(),
  customOpenAiApiKey: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  openaiApiKey: "",
  openaiModelName: "gpt-3.5-turbo",
  claudeApiKey: "",
  claudeModelName: "claude-2.1",
  geminiApiKey: "",
  geminiModelName: "gemini-1.5-flash-latest",
  customOpenAiBaseUrl: "",
  customOpenAiModelName: "",
  customOpenAiApiKey: "",
};

type ProviderKey = 'gemini' | 'openai' | 'claude' | 'custom';
type TestStatus = 'idle' | 'testing' | 'success' | 'failure';

export default function SettingsPage() {
  const [apiSettings, setApiSettings] = useLocalStorage<ApiSettings>('apiSettings', defaultValues as ApiSettings);
  const { toast } = useToast();
  const [testStatuses, setTestStatuses] = useState<Record<ProviderKey, TestStatus>>({
    gemini: 'idle',
    openai: 'idle',
    claude: 'idle',
    custom: 'idle',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: apiSettings,
  });
  
  React.useEffect(() => {
    form.reset(apiSettings);
  }, [apiSettings, form]);

  function onSubmit(values: FormValues) {
    setApiSettings(values as ApiSettings);
    toast({
      title: "设置已保存",
      description: "您的 API 配置已更新。",
    });
  }

  const handleTestConnection = async (provider: ProviderKey) => {
    setTestStatuses(prev => ({ ...prev, [provider]: 'testing' }));
    const values = form.getValues();
    let result: { success: boolean; message: string } = { success: false, message: "Provider not recognized." };

    try {
      if (provider === 'gemini') {
        if (!values.geminiModelName) {
          result = { success: false, message: "请输入 Gemini 模型名称。" };
        } else {
          result = await testGeminiModelConnectivity({ modelName: values.geminiModelName });
        }
      } else if (provider === 'openai') {
        if (!values.openaiApiKey || !values.openaiModelName) {
          result = { success: false, message: "请输入 OpenAI API 密钥和模型名称。" };
        } else {
          result = await testOpenAIModelConnectivity({ apiKey: values.openaiApiKey, modelName: values.openaiModelName });
        }
      } else if (provider === 'claude') {
        if (!values.claudeApiKey || !values.claudeModelName) {
          result = { success: false, message: "请输入 Claude API 密钥和模型名称。" };
        } else {
          result = await testClaudeModelConnectivity({ apiKey: values.claudeApiKey, modelName: values.claudeModelName });
        }
      } else if (provider === 'custom') {
        if (!values.customOpenAiBaseUrl || !values.customOpenAiModelName) {
          result = { success: false, message: "请输入自定义端点基础 URL 和模型名称。" };
        } else {
          result = await testCustomOpenAIModelConnectivity({ 
            baseUrl: values.customOpenAiBaseUrl, 
            modelName: values.customOpenAiModelName,
            apiKey: values.customOpenAiApiKey 
          });
        }
      }

      if (result.success) {
        setTestStatuses(prev => ({ ...prev, [provider]: 'success' }));
        toast({ title: "连接成功", description: result.message, variant: 'default' });
      } else {
        setTestStatuses(prev => ({ ...prev, [provider]: 'failure' }));
        toast({ title: "连接失败", description: result.message, variant: 'destructive' });
      }
    } catch (error: any) {
      setTestStatuses(prev => ({ ...prev, [provider]: 'failure' }));
      toast({ title: "测试出错", description: error.message || "发生未知错误", variant: 'destructive' });
    }
  };

  const TestButton: React.FC<{ provider: ProviderKey }> = ({ provider }) => {
    const status = testStatuses[provider];
    switch (status) {
      case 'testing':
        return <Button type="button" variant="outline" size="sm" disabled className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 w-28"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 测试中...</Button>;
      case 'success':
        return <Button type="button" variant="outline" size="sm" disabled className="bg-green-500 hover:bg-green-600 text-white w-28"><CheckCircle2 className="mr-2 h-4 w-4" /> 成功</Button>;
      case 'failure':
        return <Button type="button" variant="destructive" size="sm" onClick={() => handleTestConnection(provider)} className="w-28"><XCircle className="mr-2 h-4 w-4" /> 重试</Button>;
      default: // idle
        return <Button type="button" variant="outline" size="sm" onClick={() => handleTestConnection(provider)} className="w-28">测试连接</Button>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">API 设置</CardTitle>
          <CardDescription>
            配置您的 AI 提供商 API 密钥和模型。这些信息将存储在您的浏览器本地。
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
              <AlertTriangle className="inline h-4 w-4 mr-1" />
              <strong>注意:</strong> API 密钥存储在浏览器本地存储中，请勿在不安全的设备上输入。对于 Gemini，Genkit 通常使用环境变量 (GOOGLE_API_KEY) 进行认证，此处的 Gemini API 密钥字段主要供您参考或用于直接的、非 Genkit 流程的 API 调用。
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Gemini Settings */}
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="text-lg font-semibold">Google Gemini</h3>
                <FormField
                  control={form.control}
                  name="geminiApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Gemini API 密钥 (参考)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="AIza..." {...field} />
                      </FormControl>
                      <FormDescription>
                        您的 Google Gemini API 密钥 (通常通过环境变量 GOOGLE_API_KEY 配置给 Genkit)。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="geminiModelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Gemini 模型名称</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input placeholder="例如: gemini-1.5-flash-latest" {...field} />
                        </FormControl>
                        <TestButton provider="gemini" />
                      </div>
                      <FormDescription>
                        输入您希望使用的 Google Gemini 模型的确切名称。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* OpenAI Settings */}
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="text-lg font-semibold">OpenAI</h3>
                <FormField
                  control={form.control}
                  name="openaiApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OpenAI API 密钥</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="sk-..." {...field} />
                      </FormControl>
                      <FormDescription>
                        您的 OpenAI 服务 API 密钥。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="openaiModelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OpenAI 模型名称</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input placeholder="例如: gpt-4, gpt-3.5-turbo" {...field} />
                        </FormControl>
                        <TestButton provider="openai" />
                      </div>
                      <FormDescription>
                        输入您希望使用的 OpenAI 模型名称。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Claude Settings */}
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="text-lg font-semibold">Anthropic Claude</h3>
                <FormField
                  control={form.control}
                  name="claudeApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Claude API 密钥</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="sk-ant-..." {...field} />
                      </FormControl>
                      <FormDescription>
                        您的 Anthropic Claude API 密钥。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="claudeModelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Claude 模型名称</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input placeholder="例如: claude-3-opus-20240229" {...field} />
                        </FormControl>
                        <TestButton provider="claude" />
                      </div>
                      <FormDescription>
                        输入您希望使用的 Claude 模型名称。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Custom OpenAI-compatible Endpoint Settings */}
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="text-lg font-semibold">自定义 OpenAI 兼容端点</h3>
                <FormField
                  control={form.control}
                  name="customOpenAiBaseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>基础 URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.example.com/v1" {...field} />
                      </FormControl>
                      <FormDescription>
                        兼容 OpenAI API 格式的自定义端点的基础 URL。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customOpenAiModelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>模型名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如: custom-model-v1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="customOpenAiApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API 密钥 (可选)</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input type="password" placeholder="自定义端点所需的 API 密钥" {...field} />
                        </FormControl>
                        <TestButton provider="custom" />
                      </div>
                      <FormDescription>
                        如果您的自定义端点需要 API 密钥，请在此处输入。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit">保存设置</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
