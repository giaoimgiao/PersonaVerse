
// The AI persona generator flow.
//
// - generatePersonaFromDescription - A function that handles the persona generation process.
// - GeneratePersonaFromDescriptionInput - The input type for the generatePersonaFromDescription function.
// - GeneratePersonaFromDescriptionOutput - The return type for the generatePersonaFromDescription function.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonaFromDescriptionInputSchema = z.object({
  description: z.string().describe('A detailed description of the character persona you want to create.'),
});
export type GeneratePersonaFromDescriptionInput = z.infer<typeof GeneratePersonaFromDescriptionInputSchema>;

const GeneratePersonaFromDescriptionOutputSchema = z.object({
  persona: z.object({
    "人设名称": z.string().describe('The name of the persona.'),
    "年龄": z.number().describe('The age of the persona.'),
    "身高": z.number().describe('The height of the persona in meters.'),
    "体重": z.number().describe('The weight of the persona in kilograms.'),
    "好感等级": z.number().describe('The favorability level of the persona, ranging from 0 to 100. Default to 50 if not otherwise specified.'),
    "性格锚点A": z.object({
      "性格特点": z.array(z.string()).describe('An array of personality traits.'),
      "性格参考模型": z.string().describe('A personality model for reference (e.g., ENFJ).'),
    }).describe('First set of personality anchors'),
    "性格锚点B": z.object({
      "性格模型": z.string().describe('A personality model.'),
      "性格变化": z.string().describe('Description of how the personality changes over time.'),
    }).describe('Second set of personality anchors'),
    "性知识与经验": z.object({
      "性知识": z.string().describe('Level of sexual knowledge.'),
      "性经验": z.string().describe('Sexual experience.'),
      "性技巧": z.string().describe('Sexual skills.'),
      "敏感带": z.string().describe('Erogenous zones.'),
      "性态度": z.string().describe('Attitude towards sex.'),
    }).describe('Information about sexuality'),
    "说话风格": z.array(z.string()).describe('An array of speaking styles.'),
    "喜好": z.object({
      "颜色": z.array(z.string()).describe('An array of favorite colors.'),
      "事物": z.array(z.string()).describe('An array of favorite things.'),
      "厌恶": z.array(z.string()).describe('An array of dislikes.'),
    }).describe('Likes and dislikes'),
    "身体特征": z.object({
      "身体敏感": z.string().describe('Level of physical sensitivity.'),
      "闷骚体质": z.boolean().describe('Whether the persona is secretly horny.'),
      "胸部": z.string().describe('Cup size.'),
      "毛发": z.string().describe('Hair description.'),
      "性器": z.string().describe('Description of genitalia.'),
      "体温": z.string().describe('Body temperature.'),
    }).describe('Physical characteristics'),
    "身份": z.string().describe('Occupation or role.'),
    "家庭背景": z.object({
      "家族": z.string().describe('Family name.'),
      "教育": z.string().describe('Education background.'),
      "家规": z.string().describe('Family rules.'),
      "家庭成员": z.array(z.string()).describe('An array of family members.'),
    }).describe('Family background'),
    "深度潜意识人格": z.object({
      "性癖": z.array(z.string()).describe('An array of kinks.'),
    }).describe('Deep subconscious personality'),
    "镜头语言": z.object({
      "描述方式": z.string().describe('Description style.'),
      "转场描述": z.string().describe('Scene transition descriptions.'),
    }).describe('Cinematic language'),
    "其他": z.object({
      "标志性穿着": z.string().describe('Signature attire.'),
      "常用社交平台": z.string().describe('Commonly used social media platforms.'),
      "闺蜜": z.string().describe('Best friend.'),
    }).describe('Miscellaneous information'),
  }).describe('The generated persona.'),
});
export type GeneratePersonaFromDescriptionOutput = z.infer<typeof GeneratePersonaFromDescriptionOutputSchema>;

export async function generatePersonaFromDescription(input: GeneratePersonaFromDescriptionInput): Promise<GeneratePersonaFromDescriptionOutput> {
  return generatePersonaFromDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonaFromDescriptionPrompt',
  input: {schema: GeneratePersonaFromDescriptionInputSchema},
  output: {schema: GeneratePersonaFromDescriptionOutputSchema},
  prompt: `You are an AI that generates character personas based on a description.

  Given the following description, create a detailed character persona:
  {{description}}

  The persona should be in the following JSON format:
  {
    "人设名称": "",
    "年龄": 0,
    "身高": 0.0,
    "体重": 0.0,
    "好感等级": 50, // Initialize favorability level, 0-100, default 50
    "性格锚点A": {
      "性格特点": [],
      "性格参考模型": ""
    },
    "性格锚点B": {
      "性格模型": "",
      "性格变化": ""
    },
    "性知识与经验": {
      "性知识": "",
      "性经验": "",
      "性技巧": "",
      "敏感带": "",
      "性态度": ""
    },
    "说话风格": [],
    "喜好": {
      "颜色": [],
      "事物": [],
      "厌恶": []
    },
    "身体特征": {
      "身体敏感": "",
      "闷骚体质": false,
      "胸部": "",
      "毛发": "",
      "性器": "",
      "体温": ""
    },
    "身份": "",
    "家庭背景": {
      "家族": "",
      "教育": "",
      "家规": "",
      "家庭成员": []
    },
    "深度潜意识人格": {
      "性癖": []
    },
    "镜头语言": {
      "描述方式": "",
      "转场描述": ""
    },
    "其他": {
      "标志性穿着": "",
      "常用社交平台": "",
      "闺蜜": ""
    }
  }
  Ensure that the persona is creative, consistent and embodies the description provided.
  Initialize "好感等级" to a value between 0 and 100, defaulting to 50 if the description doesn't imply a specific level.
  Return only valid JSON.`, 
});

const generatePersonaFromDescriptionFlow = ai.defineFlow(
  {
    name: 'generatePersonaFromDescriptionFlow',
    inputSchema: GeneratePersonaFromDescriptionInputSchema,
    outputSchema: GeneratePersonaFromDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

