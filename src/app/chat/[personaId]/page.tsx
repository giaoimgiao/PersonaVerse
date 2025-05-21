
"use client";

import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Settings, BookOpen, Send, Paperclip, Mic, Image as ImageIcon, Trash2, User, Save, PlusCircle, ChevronDown, ChevronUp, Heart, XCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Persona, ChatMessage as AppChatMessage, ChatSettings, MemoryKeyword, UserProfile, SafetySettingItem, RolePlaySettings, ApiSettings } from '@/types';
import { chatWithPersona, ChatWithPersonaInput, ChatWithPersonaOutput as FlowOutput } from '@/ai/flows/chat-with-persona';
import { calibrateFavorability, CalibrateFavorabilityInput } from '@/ai/flows/calibrate-favorability-flow';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { Label } from '@/components/ui/label';
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HARM_CATEGORIES, HARM_THRESHOLDS, DEFAULT_CHAT_SETTINGS, HarmCategoryApiValue, HarmThresholdApiValue, DEFAULT_KEYWORD } from '@/lib/constants';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import * as z from "zod";


const ChatMessageItem: React.FC<{
  message: AppChatMessage;
  persona: Persona | null;
  userProfile: UserProfile | null;
  onDelete: (messageId: string) => void;
}> = ({ message, persona, userProfile, onDelete }) => {
  const isUser = message.role === 'user';

  const userAvatarSrc = userProfile?.avatarUrl;
  const userNameInitial = userProfile?.name ? userProfile.name[0].toUpperCase() : "您";

  let personaNameInitial = "AI";
  let currentPersonaAvatar = `https://placehold.co/40x40.png?text=A&txtsize=15`;

  if (!isUser && persona) {
    const name = persona['人设名称'];
    personaNameInitial = name ? name[0].toUpperCase() : 'A';
    currentPersonaAvatar = persona.avatarImage || `https://placehold.co/40x40.png?text=${personaNameInitial}&txtsize=15`;
  }

  const [showDelete, setShowDelete] = useState(false);

  const parseAiMessageContent = (content: string): { dialogue: string; description: string | null } => {
    const regex = /^(.*?)(?:<灰字>：\(([\s\S]*?)\))?$/s;
    const match = content.match(regex);
    if (match) {
      const dialogue = match[1]?.trim() || '';
      const description = match[2]?.trim() || null;
      return { dialogue, description };
    }
    return { dialogue: content, description: null };
  };

  const aiMessageParts = !isUser ? parseAiMessageContent(message.content) : null;
  const messageTimestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div
      className={cn("flex items-end gap-2 mb-4 group", isUser ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {!isUser && aiMessageParts && (
        <>
          <Avatar className="h-8 w-8 self-start shrink-0">
            <AvatarImage src={currentPersonaAvatar} alt="Persona Avatar" data-ai-hint="character avatar" />
            <AvatarFallback>{personaNameInitial}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start gap-1 w-full max-w-[75%]">
            {aiMessageParts.dialogue && (
              <div
                className={cn(
                  "w-fit max-w-full rounded-lg px-4 py-2 shadow relative bg-card text-card-foreground rounded-bl-none"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{aiMessageParts.dialogue}</p>
                 {message.imageUrl && (
                  <div className="mt-2">
                    <Image src={message.imageUrl} alt="Sent image" width={200} height={200} className="rounded-md object-contain max-w-full h-auto" data-ai-hint="chat image"/>
                  </div>
                )}
                <p className={cn("text-xs mt-1 text-muted-foreground/70 text-left")}>
                  {messageTimestamp}
                </p>
              </div>
            )}

            {aiMessageParts.description && (
              <div
                className={cn(
                  "w-fit max-w-full rounded-lg px-3 py-2 shadow-sm bg-accent/10 text-muted-foreground rounded-bl-none text-sm italic"
                )}
              >
                <p className="whitespace-pre-wrap">{aiMessageParts.description}</p>
              </div>
            )}
            {!aiMessageParts.dialogue && aiMessageParts.description && (
                 <p className={cn("text-xs mt-0.5 text-muted-foreground/70 text-left pl-1")}>
                  {messageTimestamp}
                </p>
            )}
          </div>
        </>
      )}

      {isUser && (
        <>
          <div className="w-8 h-8 flex-shrink-0 order-first">
            {showDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-full w-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除消息?</AlertDialogTitle>
                    <AlertDialogDescription>
                      这条消息将被永久删除。此操作无法撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(message.id)} className={buttonVariants({variant: "destructive"})}>确认删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div
            className={cn(
              "max-w-[70%] rounded-lg px-4 py-2 shadow relative bg-primary text-primary-foreground rounded-br-none"
            )}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {message.imageUrl && (
              <div className="mt-2">
                <Image src={message.imageUrl} alt="Sent image" width={200} height={200} className="rounded-md object-contain max-w-full h-auto" data-ai-hint="chat image"/>
              </div>
            )}
            <p className={cn("text-xs mt-1 text-primary-foreground/70 text-right")}>
              {messageTimestamp}
            </p>
          </div>
          <Avatar className="h-8 w-8 shrink-0">
            {userAvatarSrc ? (
              <AvatarImage src={userAvatarSrc} alt="User Avatar" data-ai-hint="user avatar" />
            ) : null}
            <AvatarFallback>{userNameInitial}</AvatarFallback>
          </Avatar>
        </>
      )}
       {!isUser && showDelete && (
         <div className="w-8 h-8 flex-shrink-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-full w-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除消息?</AlertDialogTitle>
                <AlertDialogDescription>
                  这条消息将被永久删除。此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(message.id)} className={buttonVariants({variant: "destructive"})}>确认删除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};

const chatSettingsFormSchema = z.object({
  temperature: z.number().min(0).max(1).optional(),
  maxLength: z.number().min(1).max(8192).optional(),
  safetySettings: z.array(
    z.object({
      category: z.string(),
      threshold: z.string(),
    })
  ).optional(),
});
type ChatSettingsFormValues = z.infer<typeof chatSettingsFormSchema>;


const keywordFormSchema = z.object({
  id: z.string().optional(),
  term: z.string().min(1, "关键词不能为空"),
  details: z.string().min(1, "描述/Prompt不能为空"),
  enabled: z.boolean(),
  triggerSource: z.enum(['user', 'ai', 'both']),
  activationScope: z.enum(['currentTurn', 'history']),
  priority: z.number().optional(),
});
type KeywordFormValues = z.infer<typeof keywordFormSchema>;

const defaultRolePlaySettings: RolePlaySettings = {
  userGender: '',
  userRelationship: '',
  userTemporaryName: '',
  visualNovelPrompt: '',
};

const CALIBRATION_CHECK_TURNS = 3;
const MIN_HISTORY_FOR_CALIBRATION = 5;

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const personaId = params.personaId as string;

  const [personasStorage, setPersonasStorage] = useLocalStorage<Persona[]>('personas', []);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);

  const [chatMessages, setChatMessages] = useLocalStorage<AppChatMessage[]>(`chatHistory_${personaId}`, []);
  const [favorabilityHistory, setFavorabilityHistory] = useLocalStorage<number[]>(`favorabilityHistory_${personaId}`, []);

  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingImageName, setPendingImageName] = useState<string | null>(null);

  const [apiSettingsFromStorage] = useLocalStorage<ApiSettings>('apiSettings', {} as ApiSettings);


  const [userProfile] = useLocalStorage<UserProfile>('userProfile', {
    id: 'defaultUser',
    name: '尊贵的用户',
    avatarUrl: undefined
  });

  const [chatSettings, setChatSettings] = useLocalStorage<ChatSettings>(
    `chatSettings_${personaId}`,
    DEFAULT_CHAT_SETTINGS
  );

  const [keywords, setKeywords] = useLocalStorage<MemoryKeyword[]>(`keywords_${personaId}`, []);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
  const [isKeywordsSheetOpen, setIsKeywordsSheetOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<MemoryKeyword | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const [rpSettings, setRpSettings] = useLocalStorage<RolePlaySettings>(
    `rpSettings_${personaId}`,
    defaultRolePlaySettings
  );

  const settingsForm = useForm<ChatSettingsFormValues>({
    resolver: zodResolver(chatSettingsFormSchema),
    defaultValues: chatSettings,
  });

  useEffect(() => {
    settingsForm.reset(chatSettings);
  }, [chatSettings, settingsForm, isSettingsSheetOpen]);

  const keywordForm = useForm<KeywordFormValues>({
    resolver: zodResolver(keywordFormSchema),
    defaultValues: DEFAULT_KEYWORD,
  });

  useEffect(() => {
    if (editingKeyword) {
      keywordForm.reset(editingKeyword);
    } else {
      keywordForm.reset(DEFAULT_KEYWORD);
    }
  }, [editingKeyword, keywordForm, isKeywordsSheetOpen]);


  useEffect(() => {
    const personaFromStorage = personasStorage.find(p => p.id === personaId);
    if (personaFromStorage) {
      setCurrentPersona(personaFromStorage);
    } else if (personaId) {
      toast({ title: '错误', description: '找不到指定的角色。', variant: 'destructive' });
      router.push('/');
    }
  }, [personaId, personasStorage, router, toast]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleDeleteMessage = (messageId: string) => {
    setChatMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
    toast({ title: '已删除', description: '消息已成功删除。' });
  };

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: '图片过大', description: '请选择小于5MB的图片。', variant: 'destructive' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingImage(reader.result as string);
        setPendingImageName(file.name);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input to allow selecting the same file again
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const removePendingImage = () => {
    setPendingImage(null);
    setPendingImageName(null);
  };


  const handleFavorabilityCalibration = async (lastUserMessageContent: string) => {
    if (!currentPersona || isCalibrating) return;

    console.log(`[Calibration] Attempting favorability calibration for ${currentPersona.人设名称}. Current: ${currentPersona.好感等级}`);
    setIsCalibrating(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { avatarImage, id, ...personaForFlow } = currentPersona;

      const recentHistoryForCalibration = chatMessages
        .filter(m => (m.role === 'user' || m.role === 'model') && (m.content.trim() !== '' || m.imageUrl))
        .map(m => ({ role: m.role as 'user' | 'model', content: m.content, imageUrl: m.imageUrl })) // Pass imageUrl too
        .slice(-10);

      const calibrationInput: CalibrateFavorabilityInput = {
        persona: personaForFlow,
        chatHistory: recentHistoryForCalibration,
        currentFavorability: currentPersona.好感等级,
        userName: rpSettings.userTemporaryName || userProfile.name,
        userLastMessage: lastUserMessageContent,
      };

      console.log("[Calibration] Input to calibration flow:", JSON.stringify(calibrationInput, null, 2));
      const calibrationResult = await calibrateFavorability(calibrationInput);
      console.log("[Calibration] Result from calibration flow:", JSON.stringify(calibrationResult, null, 2));

      if (typeof calibrationResult.newFavorability === 'number' && calibrationResult.newFavorability !== currentPersona.好感等级) {
        console.log(`[Calibration] Favorability calibrated for ${currentPersona.人设名称}: ${currentPersona.好感等级} -> ${calibrationResult.newFavorability}`);
        const updatedPersona = { ...currentPersona, 好感等级: calibrationResult.newFavorability };
        setCurrentPersona(updatedPersona);
        setPersonasStorage(prevPersonas =>
          prevPersonas.map(p => p.id === personaId ? updatedPersona : p)
        );
        toast({ title: '系统提示', description: `${currentPersona.人设名称} 的好感度已在后台自动校准。`, variant: 'default' });
      } else if (typeof calibrationResult.newFavorability === 'number') {
        console.log(`[Calibration] Calibration ran for ${currentPersona.人设名称}, but favorability remained ${currentPersona.好感等级}.`);
      } else {
        console.warn(`[Calibration] Calibration flow for ${currentPersona.人设名称} did not return a valid new favorability.`);
      }
    } catch (error) {
      console.error(`[Calibration] Error during favorability calibration for ${currentPersona.人设名称}:`, error);
      toast({ title: '校准错误', description: '好感度后台自动校准失败。', variant: 'destructive' });
    } finally {
      setFavorabilityHistory([]);
      setIsCalibrating(false);
      console.log("[Calibration] Favorability history reset after calibration attempt.");
    }
  };


  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if ((!userInput.trim() && !pendingImage) || !currentPersona || isLoading) return;

    const userMessageContent = userInput.trim();
    const newUserMessage: AppChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      imageUrl: pendingImage || undefined,
      timestamp: Date.now(),
      personaId: currentPersona.id,
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setPendingImage(null);
    setPendingImageName(null);
    setIsLoading(true);

    try {
      const activeKeywords = keywords.filter(kw => {
        if (!kw.enabled) return false;
        if (kw.activationScope === 'currentTurn') {
          return newUserMessage.content.includes(kw.term);
        }
        if (kw.activationScope === 'history') {
          const historyToCheck = [...chatMessages, newUserMessage].slice(-5); // Check last 5 including current
          return historyToCheck.some(msg => msg.content.includes(kw.term));
        }
        return false;
      });
      
      // Prepare chat history for AI, keeping imageUrl
      const historyForAI: AppChatMessage[] = [...chatMessages, newUserMessage]
        .filter(m => (m.role === 'user' || m.role === 'model') && (m.content.trim() !== '' || m.imageUrl))
        .map(m => ({ ...m, role: m.role as 'user' | 'model' })) // Ensure role type
        .slice(-10); // Limit history length


      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { avatarImage, id, ...personaForFlow } = currentPersona;
      const flowInput: ChatWithPersonaInput = {
        persona: personaForFlow,
        chatHistory: historyForAI,
        userMessage: newUserMessage.content,
        userImage: newUserMessage.imageUrl, // Pass current turn's image
        chatSettings: chatSettings,
        activeKeywords: activeKeywords,
        userName: rpSettings.userTemporaryName || userProfile.name,
        rolePlaySettings: rpSettings,
      };

      console.log("Frontend: Sending to AI Flow:", JSON.stringify(flowInput, {depth: null, colors: true} as any));
      const result: FlowOutput = await chatWithPersona(flowInput);
      console.log("Frontend: Received from AI Flow:", JSON.stringify(result, {depth: null, colors: true} as any));

      const aiMessage: AppChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: result.aiResponse,
        // AI currently doesn't send back images in this flow
        timestamp: Date.now(),
        personaId: currentPersona.id,
      };
      setChatMessages(prev => [...prev, aiMessage]);

      if (currentPersona) {
        if (result.好感等级更新成功 && typeof result.好感等级 === 'number') {
          console.log(`Frontend: AI 好感等级已成功更新为: ${result.好感等级} (角色 ${currentPersona.id})`);
          const updatedPersona = { ...currentPersona, 好感等级: result.好感等级 };
          setCurrentPersona(updatedPersona);
          setPersonasStorage(prevPersonas =>
            prevPersonas.map(p => p.id === personaId ? updatedPersona : p)
          );

          setFavorabilityHistory(prevHistory => {
            const newHistory = [...prevHistory, result.好感等级!].slice(-CALIBRATION_CHECK_TURNS);

            if (newHistory.length === CALIBRATION_CHECK_TURNS && newHistory.every(val => val === newHistory[0])) {
              if (chatMessages.length + 1 >= MIN_HISTORY_FOR_CALIBRATION && !isCalibrating) {
                console.log(`[Calibration Trigger] 好感度已连续 ${CALIBRATION_CHECK_TURNS} 轮由AI设定为 ${newHistory[0]} 且聊天历史足够。准备触发校准。`);
                handleFavorabilityCalibration(userMessageContent);
              } else {
                console.log(`观察：角色 ${currentPersona['人设名称']} 的好感度已连续 ${CALIBRATION_CHECK_TURNS} 轮由AI设定为 ${newHistory[0]}。聊天历史不足或正在校准中 (${isCalibrating})，暂不触发。`);
              }
            }
            return newHistory;
          });

        } else if (!result.好感等级更新成功 && typeof result.好感等级 === 'number') {
            console.warn(`Frontend: AI未能在此回合提供有效的好感等级更新。角色当前好感度 (${result.好感等级}) 将保持不变。AI响应：${result.aiResponse.substring(0,100)}...`);
        } else {
           console.error(`Frontend: AI Flow 返回的好感等级无效或缺失，或好感等级更新成功标志不明确。接收到的好感等级: ${result.好感等级}, 更新成功: ${result.好感等级更新成功}。完整结果: ${JSON.stringify(result)}`);
        }
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
      
      toast({ title: '错误', description: detail, variant: 'destructive' });
      if (currentPersona) {
        const systemErrorMessage: AppChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: `${personaNameInitial || '角色'} 思考的时候遇到了一点小麻烦。详情: ${detail} ${userGuidance}`,
          timestamp: Date.now(),
          personaId: currentPersona.id,
        };
        setChatMessages(prev => [...prev, systemErrorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onChatSettingsSubmit = (values: ChatSettingsFormValues) => {
    const newSettings: ChatSettings = {
        temperature: values.temperature,
        maxLength: values.maxLength,
        safetySettings: values.safetySettings?.map(s => ({
            category: s.category as HarmCategoryApiValue,
            threshold: s.threshold as HarmThresholdApiValue,
        })) || DEFAULT_CHAT_SETTINGS.safetySettings,
    };
    setChatSettings(newSettings);
    toast({ title: '设置已保存', description: '聊天参数已更新。' });
    setIsSettingsSheetOpen(false);
  };

  const handleKeywordSubmit: SubmitHandler<KeywordFormValues> = (data) => {
    if (editingKeyword) {
      setKeywords(prev => prev.map(kw => kw.id === editingKeyword.id ? { ...kw, ...data, priority: data.priority ?? 0 } : kw));
      toast({ title: '已更新', description: '关键词已更新。' });
    } else {
      const newKeyword: MemoryKeyword = {
        ...data,
        id: Date.now().toString(),
        personaId: personaId,
        priority: data.priority ?? 0,
      };
      setKeywords(prev => [newKeyword, ...prev].sort((a, b) => (a.term > b.term ? 1 : -1)));
      toast({ title: '已添加', description: '新关键词已添加。' });
    }
    setEditingKeyword(null);
    keywordForm.reset(DEFAULT_KEYWORD);
  };

  const handleEditKeyword = (keyword: MemoryKeyword) => {
    setEditingKeyword(keyword);
    keywordForm.reset(keyword);
  };

  const handleDeleteKeyword = (keywordId: string) => {
    setKeywords(prev => prev.filter(kw => kw.id !== keywordId));
    toast({ title: '已删除', description: '关键词已删除。' });
    if (editingKeyword && editingKeyword.id === keywordId) {
      setEditingKeyword(null);
      keywordForm.reset(DEFAULT_KEYWORD);
    }
  };

  const openAddKeywordForm = () => {
    setEditingKeyword(null);
    keywordForm.reset(DEFAULT_KEYWORD);
  };

  const handleRpSettingChange = <K extends keyof RolePlaySettings>(field: K, value: RolePlaySettings[K]) => {
    setRpSettings(prev => ({ ...prev, [field]: value }));
  };

  if (!currentPersona) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background text-foreground">
        <p>正在加载角色信息...</p>
      </div>
    );
  }
  const personaNameInitial = currentPersona?.['人设名称'] || "角色";


  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-3 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarImage src={currentPersona.avatarImage || `https://placehold.co/40x40.png?text=${currentPersona['人设名称'] ? currentPersona['人设名称'][0] : 'P'}&txtsize=15`} alt={currentPersona['人设名称']} data-ai-hint="character avatar"/>
            <AvatarFallback>{currentPersona['人设名称'] ? currentPersona['人设名称'][0] : 'P'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold truncate leading-tight">{currentPersona['人设名称']}</h1>
            <div className="flex items-center text-xs text-muted-foreground">
              <Heart className="h-3 w-3 mr-1 text-primary/70 fill-primary/20" />
              好感度: {currentPersona['好感等级']}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={isKeywordsSheetOpen} onOpenChange={setIsKeywordsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <BookOpen className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full md:w-[800px] md:max-w-2xl flex flex-col">
              <SheetHeader>
                <SheetTitle>关键词记忆管理</SheetTitle>
                <SheetDescription>
                  添加、编辑或删除关键词，以影响 AI 在对话中的记忆和行为。
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col md:flex-row flex-1 mt-4 overflow-hidden">
                <div className="w-full md:w-1/3 md:pr-4 md:border-r border-b md:border-b-0 pb-4 md:pb-0 flex flex-col space-y-3">
                  <Button onClick={openAddKeywordForm} variant="outline" size="sm" className="w-full flex-shrink-0">
                    <PlusCircle className="mr-2 h-4 w-4" /> 添加新关键词
                  </Button>
                  <ScrollArea className="flex-grow">
                    <h3 className="text-md font-semibold mb-2 sticky top-0 bg-card py-1 z-10">已存关键词 ({keywords.length})</h3>
                    {keywords.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">还没有添加任何关键词。</p>
                    ) : (
                      <ul className="flex flex-row flex-wrap gap-2 md:flex-col md:space-y-2 md:gap-0">
                        {keywords.sort((a, b) => a.term.localeCompare(b.term)).map(kw => (
                           <li
                            key={kw.id}
                            className={cn(
                              "border rounded-md cursor-pointer hover:bg-accent/50 relative",
                              "w-[calc(50%-4px)] p-2 text-xs", // Mobile: 2 columns
                              "sm:w-[calc(33.333%-5px)] sm:text-sm", // SM: 3 columns
                              "md:w-full md:p-3 md:text-sm", // MD+: 1 column (full width)
                              editingKeyword?.id === kw.id && "bg-accent ring-2 ring-primary"
                            )}
                            onClick={() => handleEditKeyword(kw)}
                          >
                            <div className="flex justify-between items-start space-x-1 md:space-x-2">
                              <div className="flex-grow overflow-hidden">
                                <p className="font-semibold truncate">{kw.term}</p>
                                <p className={cn(
                                  "px-1 py-0 sm:px-1.5 sm:py-0.5 rounded-full inline-block mt-1 text-[10px] sm:text-xs",
                                  kw.enabled ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                )}>
                                  {kw.enabled ? "启用" : "禁用"}
                                </p>
                                <p className="text-muted-foreground truncate max-w-full mt-1 hidden md:block" title={kw.details}>
                                  {kw.details}
                                </p>
                                <p className="text-muted-foreground text-xs hidden md:block">
                                  触发: {kw.triggerSource === 'user' ? '用户' : kw.triggerSource === 'ai' ? 'AI' : '两者'}, 范围: {kw.activationScope === 'currentTurn' ? '当前回合' : '聊天历史'}
                                </p>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                                    onClick={(e) => { e.stopPropagation(); }} // Stop propagation to prevent edit
                                    aria-label={`删除关键词 ${kw.term}`}
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>确认删除关键词?</AlertDialogTitle>
                                    <AlertDialogDescription>关键词 "{kw.term}" 将被永久删除。</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteKeyword(kw.id)} className={buttonVariants({variant: "destructive"})}>确认删除</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </ScrollArea>
                </div>

                <div className="w-full md:flex-1 md:pl-4 pt-4 md:pt-0 flex flex-col">
                  <ScrollArea className="h-full">
                    <form onSubmit={keywordForm.handleSubmit(handleKeywordSubmit)} className="space-y-4 h-full flex flex-col">
                      <h3 className="text-md font-semibold sticky top-0 bg-card py-1 z-10 flex-shrink-0">{editingKeyword ? `编辑关键词: ${editingKeyword.term}` : "添加新关键词"}</h3>
                      <div className="flex-grow space-y-4">
                        <div>
                          <Label htmlFor="term">关键词 (Term)</Label>
                          <Input id="term" {...keywordForm.register("term")} className="mt-1" />
                          {keywordForm.formState.errors.term && <p className="text-destructive text-xs mt-1">{keywordForm.formState.errors.term.message}</p>}
                        </div>
                        <div>
                          <Label htmlFor="details">描述/Prompt (Details)</Label>
                          <Textarea id="details" {...keywordForm.register("details")} className="mt-1 h-24" />
                          {keywordForm.formState.errors.details && <p className="text-destructive text-xs mt-1">{keywordForm.formState.errors.details.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="triggerSource">触发源 (Trigger Source)</Label>
                            <Controller
                              name="triggerSource"
                              control={keywordForm.control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="mt-1"><SelectValue placeholder="选择触发源" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">用户</SelectItem>
                                    <SelectItem value="ai">AI</SelectItem>
                                    <SelectItem value="both">两者</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div>
                            <Label htmlFor="activationScope">激活范围 (Activation Scope)</Label>
                            <Controller
                              name="activationScope"
                              control={keywordForm.control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="mt-1"><SelectValue placeholder="选择激活范围" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="currentTurn">当前回合</SelectItem>
                                    <SelectItem value="history">聊天历史</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Controller
                                name="enabled"
                                control={keywordForm.control}
                                render={({ field }) => ( <Checkbox id="enabled" checked={field.value} onCheckedChange={field.onChange} /> )}
                            />
                            <Label htmlFor="enabled" className="text-sm font-medium leading-none">启用此关键词</Label>
                        </div>
                      </div>
                      <div className="flex-shrink-0 mt-auto pt-4 border-t">
                        <Button type="submit" className="w-full">
                          <Save className="mr-2 h-4 w-4" /> {editingKeyword ? "保存更改" : "添加关键词"}
                        </Button>
                        {editingKeyword && (
                          <Button type="button" variant="outline" onClick={openAddKeywordForm} className="w-full mt-2">
                            取消编辑 / 新建
                          </Button>
                        )}
                      </div>
                    </form>
                  </ScrollArea>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={isSettingsSheetOpen} onOpenChange={setIsSettingsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>聊天设置</SheetTitle>
                <SheetDescription>
                  调整 AI 模型的行为参数和安全设置。
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={settingsForm.handleSubmit(onChatSettingsSubmit)} className="space-y-6 py-4">
                <div>
                  <Label htmlFor="temperature">温度 (Temperature): {settingsForm.watch('temperature') ?? chatSettings.temperature}</Label>
                  <Controller
                    name="temperature"
                    control={settingsForm.control}
                    render={({ field }) => (
                       <Slider
                        id="temperature"
                        min={0}
                        max={1}
                        step={0.05}
                        defaultValue={[field.value ?? DEFAULT_CHAT_SETTINGS.temperature!]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="mt-2"
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-1">控制随机性。较低值更保守，较高值更多样。</p>
                </div>

                <div>
                  <Label htmlFor="maxLength">最大输出长度 (Max Length): {settingsForm.watch('maxLength') ?? chatSettings.maxLength}</Label>
                   <Controller
                    name="maxLength"
                    control={settingsForm.control}
                    render={({ field }) => (
                      <Input
                        id="maxLength"
                        type="number"
                        min={50}
                        max={8000}
                        step={50}
                        value={field.value ?? DEFAULT_CHAT_SETTINGS.maxLength!}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                        className="mt-1"
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-1">AI 回复的最大字符数或令牌数。</p>
                </div>

                <h3 className="text-md font-semibold pt-2 border-t mt-4">Gemini 安全设置</h3>
                {HARM_CATEGORIES.map((harmCategory, index) => (
                  <div key={harmCategory.apiValue}>
                    <Label htmlFor={`safety-${harmCategory.apiValue}`}>{harmCategory.label}</Label>
                    <Controller
                      name={`safetySettings.${index}.threshold`}
                      control={settingsForm.control}
                      defaultValue={chatSettings.safetySettings?.find(s => s.category === harmCategory.apiValue)?.threshold || DEFAULT_CHAT_SETTINGS.safetySettings.find(s => s.category === harmCategory.apiValue)?.threshold}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || chatSettings.safetySettings?.find(s => s.category === harmCategory.apiValue)?.threshold || DEFAULT_CHAT_SETTINGS.safetySettings.find(s => s.category === harmCategory.apiValue)?.threshold}
                        >
                          <SelectTrigger id={`safety-${harmCategory.apiValue}`} className="mt-1">
                            <SelectValue placeholder="选择过滤级别" />
                          </SelectTrigger>
                          <SelectContent>
                            {HARM_THRESHOLDS.map(threshold => (
                              <SelectItem key={threshold.apiValue} value={threshold.apiValue}>
                                {threshold.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                     <Controller
                        name={`safetySettings.${index}.category`}
                        control={settingsForm.control}
                        defaultValue={harmCategory.apiValue} // Ensures category is always set
                        render={({ field }) => <input type="hidden" {...field} />}
                      />
                  </div>
                ))}
                <SheetFooter className="mt-6">
                  <SheetClose asChild>
                    <Button type="button" variant="outline">取消</Button>
                  </SheetClose>
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    保存设置
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <Accordion type="single" collapsible className="px-3 py-2 border-b bg-card">
        <AccordionItem value="rp-settings">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>角色扮演设定 (场景细节)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rp-gender">你的性别</Label>
                <Select
                  value={rpSettings.userGender}
                  onValueChange={(value) => handleRpSettingChange('userGender', value as RolePlaySettings['userGender'])}
                >
                  <SelectTrigger id="rp-gender" className="mt-1">
                    <SelectValue placeholder="选择你的性别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="男">男</SelectItem>
                    <SelectItem value="女">女</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                    <SelectItem value="unspecified">未指定</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rp-temp-name">临时扮演名称 (AI对你的称呼)</Label>
                <Input
                  id="rp-temp-name"
                  value={rpSettings.userTemporaryName || ''}
                  onChange={(e) => handleRpSettingChange('userTemporaryName', e.target.value)}
                  placeholder={userProfile.name || "例如：旅行者"}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="rp-relationship">你与角色的关系/背景 (例如：我是你的哥哥)</Label>
              <Input
                id="rp-relationship"
                value={rpSettings.userRelationship || ''}
                onChange={(e) => handleRpSettingChange('userRelationship', e.target.value)}
                placeholder="例如：青梅竹马、老师、陌生人..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rp-visual-prompt">"镜头语言"风格提示 (视觉小说描述指令)</Label>
              <Textarea
                id="rp-visual-prompt"
                value={rpSettings.visualNovelPrompt || ''}
                onChange={(e) => handleRpSettingChange('visualNovelPrompt', e.target.value)}
                placeholder="输入详细的视觉小说风格描述指令，例如：&#10;剧情以{{user}}为主视角...&#10;输出故事的情节要以类视觉网文小说为载体,以第三人称详细描述{{char}}的表情、动作和肉体..."
                className="mt-1 h-24"
              />
               <p className="text-xs text-muted-foreground mt-1">{ '提示：使用 `{{char}}` 代表AI角色，`{{user}}` 代表你。描述段落将以 `&lt;灰字&gt;：(...)` 格式呈现。' }</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>


      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        {chatMessages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            persona={currentPersona}
            userProfile={userProfile}
            onDelete={handleDeleteMessage}
          />
        ))}
        {isLoading && currentPersona && (
           <div className={cn("flex items-end gap-2 mb-4 justify-start")}>
            <Avatar className="h-8 w-8 self-start shrink-0">
              <AvatarImage src={currentPersona.avatarImage || `https://placehold.co/40x40.png?text=${currentPersona['人设名称'] ? currentPersona['人设名称'][0] : 'P'}&txtsize=15`} alt={currentPersona['人设名称']} data-ai-hint="character avatar"/>
              <AvatarFallback>{currentPersona['人设名称'] ? currentPersona['人设名称'][0] : 'P'}</AvatarFallback>
            </Avatar>
            <div className={cn("max-w-[70%] rounded-lg px-4 py-3 shadow bg-card text-card-foreground rounded-bl-none")}>
                <p className="text-sm animate-pulse">正在输入...</p>
            </div>
          </div>
        )}
      </ScrollArea>
      
      {pendingImage && (
        <div className="p-3 border-t bg-card flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Image src={pendingImage} alt="Image preview" width={40} height={40} className="rounded object-cover" data-ai-hint="image preview"/>
            <span className="truncate max-w-xs">{pendingImageName || "图片预览"}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={removePendingImage} aria-label="Remove image">
            <XCircle className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      )}

      <footer className="p-3 border-t bg-card sticky bottom-0 z-10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageInputChange}
            accept="image/png, image/jpeg, image/gif, image/webp"
            className="hidden"
          />
          <Button variant="ghost" size="icon" type="button" onClick={() => imageInputRef.current?.click()} aria-label="Attach image">
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" type="button" onClick={() => {
            const speechSvcUrl = apiSettingsFromStorage?.speechToTextServiceUrl;
            if (speechSvcUrl) {
              toast({ title: '语音服务已配置', description: `将使用 ${speechSvcUrl} (此功能仍在开发中)` });
            } else {
              toast({ title: '语音服务未配置', description: '请先在“设置”页面配置语音转文字服务URL。', variant: 'destructive'});
            }
          }} aria-label="Voice input">
            <Mic className="h-5 w-5" />
          </Button>
          <Input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="输入消息..."
            className="flex-grow"
            disabled={isLoading || isCalibrating}
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={isLoading || isCalibrating || (!userInput.trim() && !pendingImage)}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
