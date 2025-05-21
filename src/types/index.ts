
export interface PersonalityAnchorA {
  "性格特点": string[];
  "性格参考模型": string;
}

export interface PersonalityAnchorB {
  "性格模型": string;
  "性格变化": string;
}

export interface SexualityInfo {
  "性知识": string;
  "性经验": string;
  "性技巧": string;
  "敏感带": string;
  "性态度": string;
}

export interface Preferences {
  "颜色": string[];
  "事物": string[];
  "厌恶": string[];
}

export interface PhysicalTraits {
  "身体敏感": string;
  "闷骚体质": boolean;
  "胸部": string;
  "毛发": string;
  "性器": string;
  "体温": string;
}

export interface FamilyBackground {
  "家族": string;
  "教育": string;
  "家规": string;
  "家庭成员": string[];
}

export interface SubconsciousPersonality {
  "性癖": string[];
}

export interface CinematicLanguage {
  "描述方式": string;
  "转场描述": string;
}

export interface MiscellaneousInfo {
  "标志性穿着": string;
  "常用社交平台": string;
  "闺蜜": string;
}

export interface PersonaData {
  "人设名称": string;
  "年龄": number;
  "身高": number;
  "体重": number;
  "好感等级": number;
  "性格锚点A": PersonalityAnchorA;
  "性格锚点B": PersonalityAnchorB;
  "性知识与经验": SexualityInfo;
  "说话风格": string[];
  "喜好": Preferences;
  "身体特征": PhysicalTraits;
  "身份": string;
  "家庭背景": FamilyBackground;
  "深度潜意识人格": SubconsciousPersonality;
  "镜头语言": CinematicLanguage;
  "其他": MiscellaneousInfo;
  avatarImage?: string; // Can be base64 data URI or a URL path
}

export interface Persona extends PersonaData {
  id: string;
}

export interface GeneratePersonaOutput {
  persona: PersonaData;
}

export interface ApiSettings {
  openaiApiKey?: string;
  openaiModelName?: string;
  claudeApiKey?: string;
  claudeModelName?: string;
  geminiApiKey?: string;
  geminiModelName?: string;
  customOpenAiBaseUrl?: string;
  customOpenAiModelName?: string;
  customOpenAiApiKey?: string;
  speechToTextServiceUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  imageUrl?: string; // For Base64 Data URL of the image
  timestamp: number;
  personaId?: string;
}

export interface SafetySettingItem {
  category: string;
  threshold: string;
}

export interface ChatSettings {
  temperature?: number;
  maxLength?: number;
  safetySettings?: SafetySettingItem[];
}

export type KeywordTriggerSource = 'user' | 'ai' | 'both';
export type KeywordActivationScope = 'currentTurn' | 'history';

export interface MemoryKeyword {
  id: string;
  term: string;
  details: string;
  personaId?: string;
  enabled: boolean;
  triggerSource: KeywordTriggerSource;
  activationScope: KeywordActivationScope;
  priority: number;
}

export interface ChatWithPersonaOutput {
  aiResponse: string;
  好感等级: number;
  好感等级更新成功?: boolean;
}

export interface RolePlaySettings {
  userGender?: '男' | '女' | '其他' | 'unspecified' | '';
  userRelationship?: string;
  userTemporaryName?: string;
  visualNovelPrompt?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string; // Path or data URI
  text: string;
  timestamp: number;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string; // Path or data URI
  title: string;
  content: string;
  associatedPersonaId?: string;
  associatedPersonaName?: string;
  associatedPersonaAvatarUrl?: string; // Path or data URI, derived from associatedPersonaData.avatarImage by backend
  associatedPersonaData?: PersonaData; // Full persona data for import
  tags?: string[];
  timestamp: number;
  likes: number;
  comments: Comment[];
  commentCount: number;
  isRecommended?: boolean;
  isManuallyHot?: boolean;
}

// Input for the chatWithPersona AI flow
export interface ChatWithPersonaInput {
  persona: PersonaData;
  chatHistory: ChatMessage[]; // Use the ChatMessage type which includes imageUrl
  userMessage: string;
  userImage?: string; // Base64 Data URL for the image sent in the current turn
  chatSettings?: ChatSettings;
  activeKeywords?: MemoryKeyword[];
  userName?: string;
  rolePlaySettings?: RolePlaySettings;
}
