
import type { SafetySettingItem, MemoryKeyword } from '@/types';

export const HARM_CATEGORIES = [
  { apiValue: 'HARM_CATEGORY_HARASSMENT', label: '骚扰内容' },
  { apiValue: 'HARM_CATEGORY_HATE_SPEECH', label: '仇恨言论' },
  { apiValue: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', label: '露骨色情内容' },
  { apiValue: 'HARM_CATEGORY_DANGEROUS_CONTENT', label: '危险内容' },
  { apiValue: 'HARM_CATEGORY_CIVIC_INTEGRITY', label: '公民诚信内容' },
] as const;

export type HarmCategoryApiValue = typeof HARM_CATEGORIES[number]['apiValue'];

export const HARM_THRESHOLDS = [
  { apiValue: 'BLOCK_NONE', label: '不屏蔽 (BLOCK_NONE)' },
  { apiValue: 'BLOCK_ONLY_HIGH', label: '仅屏蔽高风险 (BLOCK_ONLY_HIGH)' },
  { apiValue: 'BLOCK_MEDIUM_AND_ABOVE', label: '屏蔽中/高风险 (BLOCK_MEDIUM_AND_ABOVE)' },
  { apiValue: 'BLOCK_LOW_AND_ABOVE', label: '屏蔽低/中/高风险 (BLOCK_LOW_AND_ABOVE)' },
] as const;

export type HarmThresholdApiValue = typeof HARM_THRESHOLDS[number]['apiValue'];

export const DEFAULT_SAFETY_SETTINGS: SafetySettingItem[] = HARM_CATEGORIES.map(category => ({
  category: category.apiValue,
  threshold: 'BLOCK_MEDIUM_AND_ABOVE',
}));

export const DEFAULT_CHAT_SETTINGS = {
  temperature: 0.7,
  maxLength: 500,
  safetySettings: DEFAULT_SAFETY_SETTINGS,
};

export const DEFAULT_KEYWORD: Omit<MemoryKeyword, 'id' | 'personaId'> = {
  term: '',
  details: '',
  enabled: true,
  triggerSource: 'both',
  activationScope: 'currentTurn',
  priority: 0,
};

export const ADMIN_USER_ID = "user_752943";
