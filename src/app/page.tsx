
"use client";

import React, { useState, useEffect, ChangeEvent } from 'react';
import { PlusCircle, MessageSquare, Settings2, Trash2, Heart, ShieldCheck } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadcnCardDescription, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as ShadcnDialogDescriptionOriginal,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger as AlertDialogTriggerComponent,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Persona, PersonaData, GeneratePersonaOutput, UserProfile } from '@/types';
import { generatePersonaFromDescription } from '@/ai/flows/generate-persona';
import { refinePersona } from '@/ai/flows/refine-persona';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ADMIN_USER_ID } from '@/lib/constants';

const initialManualFormData: PersonaData = {
  "人设名称": "",
  "年龄": 0,
  "身高": 0,
  "体重": 0,
  "好感等级": 50,
  "性格锚点A": { "性格特点": [], "性格参考模型": "" },
  "性格锚点B": { "性格模型": "", "性格变化": "" },
  "性知识与经验": { "性知识": "", "性经验": "", "性技巧": "", "敏感带": "", "性态度": "" },
  "说话风格": [],
  "喜好": { "颜色": [], "事物": [], "厌恶": [] },
  "身体特征": { "身体敏感": "", "闷骚体质": false, "胸部": "", "毛发": "", "性器": "", "体温": "" },
  "身份": "",
  "家庭背景": { "家族": "", "教育": "", "家规": "", "家庭成员": [] },
  "深度潜意识人格": { "性癖": [] },
  "镜头语言": { "描述方式": "", "转场描述": "" },
  "其他": { "标志性穿着": "", "常用社交平台": "", "闺蜜": "" },
  avatarImage: undefined,
};


const PersonaCard: React.FC<{ persona: Persona; onSelect: () => void; onRefine: () => void; onDelete: () => void; }> = ({ persona, onSelect, onRefine, onDelete }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
      <CardHeader onClick={onSelect} className="cursor-pointer relative p-4">
        <div className="flex justify-between items-start space-x-3">
          <div className="flex-grow flex flex-col space-y-1">
            <div className="flex items-center space-x-2 mb-1">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute w-full h-full text-primary/30 fill-current">
                  <polygon points="50,0 100,50 50,100 0,50"/>
                </svg>
                <Heart className="relative w-4 h-4 text-primary-foreground" />
                <span className="absolute bottom-0 right-0 text-xs font-bold text-primary-foreground transform translate-x-1/4 translate-y-1/4 bg-primary rounded-full px-1 leading-tight">
                  {persona['好感等级']}
                </span>
              </div>
              <CardTitle className="text-lg leading-tight">{persona['人设名称']}</CardTitle>
            </div>
            <ShadcnCardDescription className="text-xs">
              {persona['年龄']} 岁 | {persona['身份']}
            </ShadcnCardDescription>
          </div>
          <div className="flex-shrink-0 w-20 h-20">
            <Image
              src={persona.avatarImage || `https://placehold.co/80x80.png?text=${persona['人设名称'] ? persona['人设名称'][0] : 'P'}&txtsize=20`}
              alt={persona['人设名称']}
              width={80}
              height={80}
              className="rounded-lg object-cover border w-full h-full"
              data-ai-hint="character avatar"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow cursor-pointer p-4 pt-0" onClick={onSelect}>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {persona['性格锚点A']['性格特点']?.length > 0 ? persona['性格锚点A']['性格特点'].slice(0, 3).join('，') + (persona['性格锚点A']['性格特点'].length > 3 ? '...' : '') : '暂无性格特点'}
        </p>
      </CardContent>
      <CardFooter className="p-4 border-t grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onRefine}>
          <Settings2 className="mr-2 h-4 w-4" />
          优化
        </Button>
        {/* Removed AlertDialogTriggerComponent wrapper here. The Button's onClick already triggers the dialog via parent state. */}
        <Button variant="destructive" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="mr-2 h-4 w-4" />
          删除
        </Button>
      </CardFooter>
    </Card>
  );
};

const PersonaDetailView: React.FC<{ persona: Persona | null; onStartChat: (personaId: string) => void }> = ({ persona, onStartChat }) => {
  if (!persona) return null;

  const handleStartChatClick = () => {
    if (persona) {
        onStartChat(persona.id);
    }
  };

  const renderContent = (data: any, currentKey?: string): React.ReactNode => {
    if (currentKey === 'avatarImage' || currentKey === 'id') return null;

    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      if (currentKey === '好感等级') {
        return <p className="text-sm">{String(data)} / 100</p>;
      }
      return <p className="text-sm">{String(data)}</p>;
    }
    if (Array.isArray(data)) {
      if (data.length === 0) return <p className="text-sm text-muted-foreground">无</p>;
      return (
        <ul className="list-disc list-inside pl-4">
          {data.map((item, index) => (
            <li key={index} className="text-sm">{renderContent(item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data);
      if (entries.length === 0) return <p className="text-sm text-muted-foreground">无</p>;
      
      const sortedEntries = entries.sort((a, b) => {
        if (a[0] === '好感等级') return -1;
        if (b[0] === '好感等级') return 1;
        return 0;
      });

      return (
        <Accordion type="multiple" className="w-full" defaultValue={currentKey === '好感等级' ? ['好感等级'] : (sortedEntries.length > 0 ? [sortedEntries[0][0]] : [])}>
          {sortedEntries.map(([key, value]) => {
            if (key === 'avatarImage' || key === 'id') return null;
            const isFavorability = key === '好感等级';
            return (
              <AccordionItem value={key} key={key} className={cn(isFavorability ? "border-b-2 border-primary/50" : "")}>
                <AccordionTrigger className={cn("text-base font-medium hover:no-underline", isFavorability ? "text-primary" : "")}>{key}</AccordionTrigger>
                <AccordionContent className="pl-2">
                  {renderContent(value, key)}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      );
    }
    return <p className="text-sm text-muted-foreground">未知格式</p>;
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        {persona.avatarImage && (
            <div className="flex justify-center mb-4">
              <div className="w-[100px] h-[100px]"> {/* Explicit size for container */}
                <Image
                  src={persona.avatarImage}
                  alt={persona['人设名称']}
                  width={100}
                  height={100}
                  className="rounded-lg object-cover w-full h-full"  // fill container
                  data-ai-hint="character portrait"
                />
              </div>
            </div>
        )}
        <DialogTitle className="text-2xl">{persona['人设名称']}</DialogTitle>
        <ShadcnDialogDescriptionOriginal>
          {persona['年龄']} 岁 | {persona['身高']}米 | {persona['体重']}公斤 | {persona['身份']}
        </ShadcnDialogDescriptionOriginal>
      </DialogHeader>
      <ScrollArea className="h-[50vh] pr-4">
        {renderContent(persona)}
      </ScrollArea>
      <DialogFooter className="sm:justify-between">
        <Button variant="default" onClick={handleStartChatClick}>
            <MessageSquare className="mr-2 h-4 w-4" />
            开始聊天
        </Button>
        <DialogClose asChild>
          <Button variant="outline">关闭</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

const ManualFormFields: React.FC<{ formData: PersonaData, onFormChange: (fieldPath: string, value: any) => void, stringToArrayFields: string[] }> = ({ formData, onFormChange, stringToArrayFields }) => {
  const getStringValueForArrayField = (fieldPath: string) => {
    const keys = fieldPath.split('.');
    let currentVal: any = formData;
    for (const key of keys) {
      if (currentVal && typeof currentVal === 'object' && key in currentVal) {
        currentVal = currentVal[key];
      } else {
        return '';
      }
    }
    return Array.isArray(currentVal) ? currentVal.join(', ') : (currentVal || '');
  };

  return (
    <>
      <h3 className="text-lg font-semibold mt-4 border-b pb-2">基本信息</h3>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4">
        <Label htmlFor="人设名称" className="text-right whitespace-nowrap">人设名称*</Label>
        <Input id="人设名称" value={formData['人设名称']} onChange={e => onFormChange('人设名称', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
        <Label htmlFor="年龄" className="text-right whitespace-nowrap">年龄</Label>
        <Input id="年龄" type="number" value={formData['年龄'] || 0} onChange={e => onFormChange('年龄', parseInt(e.target.value) || 0)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
        <Label htmlFor="身高" className="text-right whitespace-nowrap">身高 (米)</Label>
        <Input id="身高" type="number" step="0.01" value={formData['身高'] || 0} onChange={e => onFormChange('身高', parseFloat(e.target.value) || 0)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
        <Label htmlFor="体重" className="text-right whitespace-nowrap">体重 (公斤)</Label>
        <Input id="体重" type="number" step="0.1" value={formData['体重'] || 0} onChange={e => onFormChange('体重', parseFloat(e.target.value) || 0)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
        <Label htmlFor="好感等级" className="text-right whitespace-nowrap">好感等级</Label>
        <Input id="好感等级" type="number" min="0" max="100" value={formData['好感等级'] || 0} onChange={e => onFormChange('好感等级', parseInt(e.target.value) || 0)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="身份" className="text-right whitespace-nowrap">身份</Label>
          <Input id="身份" value={formData['身份']} onChange={e => onFormChange('身份', e.target.value)}  />
      </div>

      <h3 className="text-lg font-semibold mt-4 border-b pb-2">性格锚点A</h3>
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 mt-2">
        <Label htmlFor="性格特点A" className="text-right whitespace-nowrap pt-1">性格特点 <small>(逗号分隔)</small></Label>
        <Textarea id="性格特点A" value={getStringValueForArrayField('性格锚点A.性格特点')} onChange={e => onFormChange('性格锚点A.性格特点', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
        <Label htmlFor="性格参考模型A" className="text-right whitespace-nowrap">性格参考模型</Label>
        <Input id="性格参考模型A" value={formData['性格锚点A']['性格参考模型']} onChange={e => onFormChange('性格锚点A.性格参考模型', e.target.value)}  />
      </div>

      <h3 className="text-lg font-semibold mt-4 border-b pb-2">性格锚点B</h3>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
        <Label htmlFor="性格模型B" className="text-right whitespace-nowrap">性格模型</Label>
        <Input id="性格模型B" value={formData['性格锚点B']['性格模型']} onChange={e => onFormChange('性格锚点B.性格模型', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 mt-2">
        <Label htmlFor="性格变化B" className="text-right whitespace-nowrap pt-1">性格变化</Label>
        <Textarea id="性格变化B" value={formData['性格锚点B']['性格变化']} onChange={e => onFormChange('性格锚点B.性格变化', e.target.value)}  />
      </div>

      <h3 className="text-lg font-semibold mt-4 border-b pb-2">性知识与经验</h3>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="性知识" className="text-right whitespace-nowrap">性知识</Label>
          <Input id="性知识" value={formData['性知识与经验']['性知识']} onChange={e => onFormChange('性知识与经验.性知识', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="性经验" className="text-right whitespace-nowrap">性经验</Label>
          <Input id="性经验" value={formData['性知识与经验']['性经验']} onChange={e => onFormChange('性知识与经验.性经验', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="性技巧" className="text-right whitespace-nowrap">性技巧</Label>
          <Input id="性技巧" value={formData['性知识与经验']['性技巧']} onChange={e => onFormChange('性知识与经验.性技巧', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="敏感带" className="text-right whitespace-nowrap">敏感带</Label>
          <Input id="敏感带" value={formData['性知识与经验']['敏感带']} onChange={e => onFormChange('性知识与经验.敏感带', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="性态度" className="text-right whitespace-nowrap">性态度</Label>
          <Input id="性态度" value={formData['性知识与经验']['性态度']} onChange={e => onFormChange('性知识与经验.性态度', e.target.value)}  />
      </div>

      <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 mt-4">
          <Label htmlFor="说话风格" className="text-right whitespace-nowrap pt-1">说话风格 <small>(逗号分隔)</small></Label>
          <Textarea id="说话风格" value={getStringValueForArrayField('说话风格')} onChange={e => onFormChange('说话风格', e.target.value)}  />
      </div>

      <h3 className="text-lg font-semibold mt-4 border-b pb-2">喜好</h3>
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 mt-2">
        <Label htmlFor="喜好颜色" className="text-right whitespace-nowrap pt-1">颜色 <small>(逗号分隔)</small></Label>
        <Textarea id="喜好颜色" value={getStringValueForArrayField('喜好.颜色')} onChange={e => onFormChange('喜好.颜色', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 mt-2">
        <Label htmlFor="喜好事w" className="text-right whitespace-nowrap pt-1">事物 <small>(逗号分隔)</small></Label>
        <Textarea id="喜好事w" value={getStringValueForArrayField('喜好.事物')} onChange={e => onFormChange('喜好.事物', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 mt-2">
        <Label htmlFor="喜好厌恶" className="text-right whitespace-nowrap pt-1">厌恶 <small>(逗号分隔)</small></Label>
        <Textarea id="喜好厌恶" value={getStringValueForArrayField('喜好.厌恶')} onChange={e => onFormChange('喜好.厌恶', e.target.value)}  />
      </div>

      <h3 className="text-lg font-semibold mt-4 border-b pb-2">身体特征</h3>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="身体敏感" className="text-right whitespace-nowrap">身体敏感</Label>
          <Input id="身体敏感" value={formData['身体特征']['身体敏感']} onChange={e => onFormChange('身体特征.身体敏感', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="闷骚体质" className="text-right whitespace-nowrap">闷骚体质</Label>
          <Checkbox id="闷骚体质" checked={formData['身体特征']['闷骚体质']} onCheckedChange={checked => onFormChange('身体特征.闷骚体质', !!checked)} className="justify-self-start" />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="胸部" className="text-right whitespace-nowrap">胸部</Label>
          <Input id="胸部" value={formData['身体特征']['胸部']} onChange={e => onFormChange('身体特征.胸部', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="毛发" className="text-right whitespace-nowrap">毛发</Label>
          <Input id="毛发" value={formData['身体特征']['毛发']} onChange={e => onFormChange('身体特征.毛发', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="性器" className="text-right whitespace-nowrap">性器</Label>
          <Input id="性器" value={formData['身体特征']['性器']} onChange={e => onFormChange('身体特征.性器', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="体温" className="text-right whitespace-nowrap">体温</Label>
          <Input id="体温" value={formData['身体特征']['体温']} onChange={e => onFormChange('身体特征.体温', e.target.value)}  />
      </div>

      <h3 className="text-lg font-semibold mt-4 border-b pb-2">家庭背景</h3>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="家族" className="text-right whitespace-nowrap">家族</Label>
          <Input id="家族" value={formData['家庭背景']['家族']} onChange={e => onFormChange('家庭背景.家族', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="教育" className="text-right whitespace-nowrap">教育</Label>
          <Input id="教育" value={formData['家庭背景']['教育']} onChange={e => onFormChange('家庭背景.教育', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 mt-2">
        <Label htmlFor="家规" className="text-right whitespace-nowrap pt-1">家规</Label>
        <Textarea id="家规" value={formData['家庭背景']['家规']} onChange={e => onFormChange('家庭背景.家规', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 mt-2">
        <Label htmlFor="家庭成员" className="text-right whitespace-nowrap pt-1">家庭成员 <small>(逗号分隔)</small></Label>
        <Textarea id="家庭成员" value={getStringValueForArrayField('家庭背景.家庭成员')} onChange={e => onFormChange('家庭背景.家庭成员', e.target.value)}  />
      </div>

      <h3 className="text-lg font-semibold mt-4 border-b pb-2">深度潜意识人格</h3>
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 mt-2">
        <Label htmlFor="性癖" className="text-right whitespace-nowrap pt-1">性癖 <small>(逗号分隔)</small></Label>
        <Textarea id="性癖" value={getStringValueForArrayField('深度潜意识人格.性癖')} onChange={e => onFormChange('深度潜意识人格.性癖', e.target.value)}  />
      </div>

      <h3 className="text-lg font-semibold mt-4 border-b pb-2">镜头语言</h3>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="描述方式" className="text-right whitespace-nowrap">描述方式</Label>
          <Input id="描述方式" value={formData['镜头语言']['描述方式']} onChange={e => onFormChange('镜头语言.描述方式', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 mt-2">
        <Label htmlFor="转场描述" className="text-right whitespace-nowrap pt-1">转场描述</Label>
        <Textarea id="转场描述" value={formData['镜头语言']['转场描述']} onChange={e => onFormChange('镜头语言.转场描述', e.target.value)}  />
      </div>

      <h3 className="text-lg font-semibold mt-4 border-b pb-2">其他</h3>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="标志性穿着" className="text-right whitespace-nowrap">标志性穿着</Label>
          <Input id="标志性穿着" value={formData['其他']['标志性穿着']} onChange={e => onFormChange('其他.标志性穿着', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="常用社交平台" className="text-right whitespace-nowrap">常用社交平台</Label>
          <Input id="常用社交平台" value={formData['其他']['常用社交平台']} onChange={e => onFormChange('其他.常用社交平台', e.target.value)}  />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-2">
          <Label htmlFor="闺蜜" className="text-right whitespace-nowrap">闺蜜</Label>
          <Input id="闺蜜" value={formData['其他']['闺蜜']} onChange={e => onFormChange('其他.闺蜜', e.target.value)}  />
      </div>
    </>
  );
};

const stringToArrayFields: string[] = [
  '性格锚点A.性格特点',
  '说话风格',
  '喜好.颜色',
  '喜好.事物',
  '喜好.厌恶',
  '家庭背景.家庭成员',
  '深度潜意识人格.性癖'
];

export default function HomePage() {
  const [personas, setPersonas] = useLocalStorage<Persona[]>('personas', []);
  const [currentUserProfile] = useLocalStorage<UserProfile>('userProfile', {
    id: `user_${typeof window !== 'undefined' ? Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5) : 'guest'}`,
    name: '访客',
    avatarUrl: undefined
  });
  const [description, setDescription] = useState('');
  const [refinementRequest, setRefinementRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRefineDialogOpen, setIsRefineDialogOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [personaToRefine, setPersonaToRefine] = useState<Persona | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [manualConfigCreate, setManualConfigCreate] = useState(false);
  const [manualFormDataCreate, setManualFormDataCreate] = useState<PersonaData>(JSON.parse(JSON.stringify(initialManualFormData)));
  
  const [manualConfigRefine, setManualConfigRefine] = useState(false);
  const [manualFormDataRefine, setManualFormDataRefine] = useState<PersonaData>(JSON.parse(JSON.stringify(initialManualFormData)));

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [personaToDeleteId, setPersonaToDeleteId] = useState<string | null>(null);

  const [isClient, setIsClient] = useState(false);
  const [emptyStateImageUrl, setEmptyStateImageUrl] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
       if (!emptyStateImageUrl) {
        // Generate a random placeholder image URL only on client-side
        setEmptyStateImageUrl(`https://placehold.co/400x300.png`);
       }
    }
  }, [emptyStateImageUrl]);


  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        if (isCreateDialogOpen && manualConfigCreate) {
          setManualFormDataCreate(prev => ({ ...prev, avatarImage: reader.result as string }));
        } else if (isRefineDialogOpen && manualConfigRefine && personaToRefine) {
          setManualFormDataRefine(prev => ({ ...prev, avatarImage: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarFile(null);
      if (isRefineDialogOpen && personaToRefine) {
        setAvatarPreview(personaToRefine.avatarImage || null);
        if (manualConfigRefine) {
           setManualFormDataRefine(prev => ({ ...prev, avatarImage: personaToRefine.avatarImage || undefined }));
        }
      } else if (isCreateDialogOpen && manualConfigCreate) {
        setAvatarPreview(manualFormDataCreate.avatarImage || null);
      } else {
        setAvatarPreview(null);
      }
    }
  };

  const handleManualFormChange = (setter: React.Dispatch<React.SetStateAction<PersonaData>>) => (fieldPath: string, value: any) => {
    setter(prev => {
      const keys = fieldPath.split('.');
      const newFormData = JSON.parse(JSON.stringify(prev)); 
      let current = newFormData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {}; 
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newFormData;
    });
  };

  const handleManualCreateFormChange = handleManualFormChange(setManualFormDataCreate);
  const handleManualRefineFormChange = handleManualFormChange(setManualFormDataRefine);


  const parseStringToArray = (str: string | string[]) => {
    if (Array.isArray(str)) return str.filter(s => typeof s === 'string' && s.trim() !== '');
    if (typeof str === 'string') return str.split(',').map(s => s.trim()).filter(s => s);
    return [];
  }
  
  const processManualFormData = (formData: PersonaData): PersonaData => {
    const processedData = JSON.parse(JSON.stringify(formData)); 

    stringToArrayFields.forEach(fieldPath => {
      const keys = fieldPath.split('.');
      let current = processedData;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (i < keys.length -1) {
          if (!current[key] || typeof current[key] !== 'object') {
             current[key] = {};
          }
          current = current[key];
        } else {
           current[key] = parseStringToArray(current[key] as string | string[]);
        }
      }
    });
    return processedData;
  };


  const handleGeneratePersona = async () => {
    setIsLoading(true);
    try {
      let newPersonaData: PersonaData;

      if (manualConfigCreate) {
        if (!manualFormDataCreate['人设名称']?.trim()) {
          toast({ title: '错误', description: '“人设名称”为必填项。', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        newPersonaData = processManualFormData(manualFormDataCreate);
        newPersonaData.avatarImage = avatarPreview || newPersonaData.avatarImage || undefined;
      } else {
        if (!description.trim()) {
          toast({ title: '错误', description: '请输入角色描述。', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        const result: GeneratePersonaOutput = await generatePersonaFromDescription({ description });
        newPersonaData = result.persona;
        if (newPersonaData.好感等级 === undefined) {
            newPersonaData.好感等级 = initialManualFormData.好感等级;
        }
        newPersonaData.avatarImage = avatarPreview || newPersonaData.avatarImage || undefined;
      }

      const newPersona: Persona = {
        ...newPersonaData,
        id: Date.now().toString(),
      };
      setPersonas((prev) => [newPersona, ...prev]);
      toast({ title: '成功', description: '新角色已创建！' });

      setDescription('');
      setAvatarFile(null);
      setAvatarPreview(null);
      setManualConfigCreate(false);
      setManualFormDataCreate(JSON.parse(JSON.stringify(initialManualFormData)));
      setIsCreateDialogOpen(false);

    } catch (error) {
      console.error('创建角色错误:', error);
      toast({ title: '错误', description: '创建角色失败，请查看控制台详情。', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefinePersona = async () => {
    if (!personaToRefine) {
      toast({ title: '错误', description: '未选择要优化的角色。', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      let updatedPersonaData: PersonaData;

      if (manualConfigRefine) {
        if (!manualFormDataRefine['人设名称']?.trim()) {
          toast({ title: '错误', description: '“人设名称”为必填项。', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        updatedPersonaData = processManualFormData(manualFormDataRefine);
        updatedPersonaData.avatarImage = avatarPreview || manualFormDataRefine.avatarImage || personaToRefine.avatarImage || undefined;
      } else {
        if (!refinementRequest.trim()) {
          toast({ title: '错误', description: '优化请求为必填项。', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { avatarImage, id, ...personaDataToRefineForAI } = personaToRefine;
        const existingPersonaString = JSON.stringify(personaDataToRefineForAI);
        const refinedPersonaString = await refinePersona({ existingPersona: existingPersonaString, refinementRequest });
        updatedPersonaData = JSON.parse(refinedPersonaString) as PersonaData;
        if (updatedPersonaData.好感等级 === undefined && personaToRefine.好感等级 !== undefined) {
            updatedPersonaData.好感等级 = personaToRefine.好感等级;
        } else if (updatedPersonaData.好感等级 === undefined) {
            updatedPersonaData.好感等级 = initialManualFormData.好感等级;
        }
        updatedPersonaData.avatarImage = avatarPreview || personaToRefine.avatarImage || undefined;
      }

      const updatedPersona: Persona = {
        ...updatedPersonaData,
        id: personaToRefine.id,
      };
      
      setPersonas((prevPersonas) =>
        prevPersonas.map(p => p.id === updatedPersona.id ? updatedPersona : p)
      );
      if (selectedPersona && selectedPersona.id === updatedPersona.id) {
        setSelectedPersona(updatedPersona);
      }

      toast({ title: '成功', description: '角色优化成功！' });
      setRefinementRequest('');
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsRefineDialogOpen(false);
      setPersonaToRefine(null);
      setManualConfigRefine(false);
      setManualFormDataRefine(JSON.parse(JSON.stringify(initialManualFormData)));

    } catch (error) {
      console.error('优化角色错误:', error);
      toast({ title: '错误', description: '优化角色失败，请查看控制台详情。', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openRefineDialog = (persona: Persona) => {
    setPersonaToRefine(persona);
    const personaCopy = JSON.parse(JSON.stringify(persona));
    if (personaCopy.好感等级 === undefined) {
        personaCopy.好感等级 = initialManualFormData.好感等级;
    }
    setManualFormDataRefine(personaCopy);
    setManualConfigRefine(false);
    setRefinementRequest('');
    setAvatarFile(null);
    setAvatarPreview(persona.avatarImage || null);
    setIsRefineDialogOpen(true);
  };
  
  const openDeleteDialog = (personaId: string) => {
    setPersonaToDeleteId(personaId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (personaToDeleteId) {
      const personaBeingDeleted = personas.find(p => p.id === personaToDeleteId);
      setPersonas(prev => prev.filter(p => p.id !== personaToDeleteId));
      toast({ title: '已删除', description: `角色 "${personaBeingDeleted?.['人设名称'] || '未知角色'}" 已被删除。` });
    }
    setIsDeleteDialogOpen(false);
    setPersonaToDeleteId(null);
    if (selectedPersona && selectedPersona.id === personaToDeleteId) {
        setSelectedPersona(null);
    }
  };


  const handleStartChat = (personaId: string) => {
    router.push(`/chat/${personaId}`);
  };


  if (!isClient) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold">你的角色</h1>
          <div className="flex gap-2">
          <Button disabled>
            <PlusCircle className="mr-2 h-5 w-5" /> 创建新角色
          </Button>
          </div>
        </div>
        <div className="text-center py-16 flex flex-col items-center">
          <p className="text-muted-foreground">正在加载角色...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">你的角色</h1>
        <div className="flex gap-2">
          {currentUserProfile && currentUserProfile.id === ADMIN_USER_ID && (
            <Button variant="outline" onClick={() => router.push('/admin')}>
              <ShieldCheck className="mr-2 h-5 w-5" /> 管理后台
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => {
            setIsCreateDialogOpen(isOpen);
            if (!isOpen) { 
              setAvatarFile(null);
              setAvatarPreview(null);
              setDescription('');
              setManualConfigCreate(false);
              setManualFormDataCreate(JSON.parse(JSON.stringify(initialManualFormData)));
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-5 w-5" /> 创建新角色
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>创建新角色</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] p-1">
                <div className="grid gap-4 py-4 pr-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="manualConfigCreate" checked={manualConfigCreate} onCheckedChange={(checked) => setManualConfigCreate(!!checked)} />
                    <Label htmlFor="manualConfigCreate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      详情配置 (手动填写所有字段)
                    </Label>
                  </div>

                  {!manualConfigCreate ? (
                    <div className="grid grid-cols-[auto_1fr] items-start gap-x-4">
                      <Label htmlFor="description" className="text-right whitespace-nowrap pt-1">
                        描述
                      </Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-32"
                        placeholder="请输入角色的详细描述，AI 将据此生成详细信息..."
                      />
                    </div>
                  ) : (
                    <ManualFormFields formData={manualFormDataCreate} onFormChange={handleManualCreateFormChange} stringToArrayFields={stringToArrayFields} />
                  )}

                  <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-4">
                    <Label htmlFor="avatarCreate" className="text-right whitespace-nowrap">
                      头像 (可选)
                    </Label>
                    <Input
                      id="avatarCreate"
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/gif"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  {avatarPreview && (
                    <div className="grid grid-cols-[auto_1fr] items-center gap-x-4">
                        <div /> 
                        <div>
                            <Image src={avatarPreview} alt="头像预览" width={80} height={80} className="rounded-lg object-cover" data-ai-hint="avatar preview"/>
                        </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button type="button" onClick={handleGeneratePersona} disabled={isLoading}>
                  {isLoading ? (manualConfigCreate ? '保存中...' : '生成中...') : (manualConfigCreate ? '保存角色' : 'AI 生成角色')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!isClient && <div className="text-center py-16 flex flex-col items-center"><p className="text-muted-foreground">正在加载角色...</p></div>}
      {isClient && personas.length === 0 && (
        <div className="text-center py-16 flex flex-col items-center">
          {emptyStateImageUrl && (
            <Image
              src={emptyStateImageUrl}
              alt="暂无角色"
              width={400}
              height={300}
              className="mb-6 rounded-lg shadow-md object-cover"
              data-ai-hint="empty state illustration"
            />
          )}
          <h2 className="text-2xl font-semibold mb-2 text-muted-foreground">暂无角色</h2>
          <p className="text-muted-foreground mb-6">开始创建你的第一个 AI 角色吧。</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" /> 创建你的第一个角色
          </Button>
        </div>
      )}
      {isClient && personas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onSelect={() => setSelectedPersona(persona)}
              onRefine={() => openRefineDialog(persona)}
              onDelete={() => {
                openDeleteDialog(persona.id);
              }}
            />
          ))}
        </div>
      )}

      <Dialog
        key={selectedPersona ? `detail-${selectedPersona.id}-${selectedPersona.avatarImage || 'no-avatar'}` : 'dialog-closed-persona-detail'}
        open={!!selectedPersona}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedPersona(null);
          }
        }}
      >
        {selectedPersona && <PersonaDetailView persona={selectedPersona} onStartChat={handleStartChat} />}
      </Dialog>

      <Dialog open={isRefineDialogOpen} onOpenChange={(isOpen) => {
          setIsRefineDialogOpen(isOpen);
           if (!isOpen) { 
            setAvatarFile(null);
            setAvatarPreview(null);
            setRefinementRequest('');
            setManualConfigRefine(false);
            setManualFormDataRefine(JSON.parse(JSON.stringify(initialManualFormData)));
            setPersonaToRefine(null);
          }
        }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>优化角色: {personaToRefine?.['人设名称']}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="grid gap-4 py-4 pr-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="manualConfigRefine" checked={manualConfigRefine} onCheckedChange={(checked) => {
                      setManualConfigRefine(!!checked);
                      if (!!checked && personaToRefine) {
                          const personaCopy = JSON.parse(JSON.stringify(personaToRefine));
                            if (personaCopy.好感等级 === undefined) {
                                personaCopy.好感等级 = initialManualFormData.好感等级;
                            }
                          setManualFormDataRefine(personaCopy);
                          setAvatarPreview(personaCopy.avatarImage || null);
                      } else if (personaToRefine) {
                          setAvatarPreview(personaToRefine.avatarImage || null);
                           setManualFormDataRefine(JSON.parse(JSON.stringify(personaToRefine || initialManualFormData)));
                      }
                  }} />
                  <Label htmlFor="manualConfigRefine" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    详情配置 (手动编辑所有字段)
                  </Label>
                </div>

                {!manualConfigRefine ? (
                  <div className="grid grid-cols-[auto_1fr] items-start gap-x-4">
                    <Label htmlFor="refinementRequest" className="text-right whitespace-nowrap pt-1">
                      优化请求
                    </Label>
                    <Textarea
                      id="refinementRequest"
                      value={refinementRequest}
                      onChange={(e) => setRefinementRequest(e.target.value)}
                      className="h-32"
                      placeholder="描述你希望如何优化这个角色..."
                    />
                  </div>
                ) : (
                  <ManualFormFields formData={manualFormDataRefine} onFormChange={handleManualRefineFormChange} stringToArrayFields={stringToArrayFields} />
                )}
                
                <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 mt-4">
                  <Label htmlFor="avatarRefine" className="text-right whitespace-nowrap">
                    新头像 (可选)
                  </Label>
                  <Input
                    id="avatarRefine"
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/gif"
                    onChange={handleAvatarChange} 
                  />
                </div>
                {avatarPreview && ( 
                  <div className="grid grid-cols-[auto_1fr] items-center gap-x-4">
                       <div /> 
                      <div>
                          <Image src={avatarPreview} alt="头像预览" width={80} height={80} className="rounded-lg object-cover" data-ai-hint="avatar preview"/>
                      </div>
                  </div>
                )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" onClick={handleRefinePersona} disabled={isLoading}>
              {isLoading ? '处理中...' : (manualConfigRefine ? '保存更改' : 'AI 优化')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setPersonaToDeleteId(null); 
          }
          setIsDeleteDialogOpen(isOpen);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除角色?</AlertDialogTitle>
            <AlertDialogDescription>
              角色 "{personas.find(p => p.id === personaToDeleteId)?.['人设名称'] || '此角色'}" 将被永久删除。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setPersonaToDeleteId(null); }}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className={buttonVariants({ variant: "destructive" })}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    
