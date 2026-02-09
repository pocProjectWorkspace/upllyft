import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  buildWorksheetSystemPrompt,
  buildWorksheetUserPrompt,
  buildSectionRegenerationPrompt,
  buildScreeningContextPrompt,
  buildIEPGoalsContextPrompt,
  buildReportContextPrompt,
  buildSessionNotesContextPrompt,
  buildVisualScheduleSystemPrompt,
  buildVisualSchedulePrompt,
  buildSocialStorySystemPrompt,
  buildSocialStoryPrompt,
  buildEmotionThermometerSystemPrompt,
  buildEmotionThermometerPrompt,
  buildWeeklyPlanSystemPrompt,
  buildWeeklyPlanPrompt,
  buildDailyRoutineSystemPrompt,
  buildDailyRoutinePrompt,
} from './constants/prompts';

// ─── Content Interfaces ──────────────────────────────────────

export interface WorksheetActivity {
  id: string;
  name: string;
  instructions: string;
  materials: string[];
  therapeuticRationale: string;
  adaptations: { easier: string; harder: string };
  imagePrompt: string;
}

export interface WorksheetSection {
  id: string;
  title: string;
  description: string;
  activities: WorksheetActivity[];
}

export interface WorksheetContent {
  title: string;
  introduction: string;
  instructions: string;
  sections: WorksheetSection[];
  tips: string[];
  notesPrompt: string;
}

// Visual Support content types
export interface VisualScheduleContent {
  title: string;
  introduction: string;
  instructions: string;
  steps: Array<{
    id: string;
    order: number;
    label: string;
    description: string;
    duration: string;
    visualCue: string;
    imagePrompt: string;
    supportTip: string;
  }>;
  transitionStrategies: string[];
  tips: string[];
  notesPrompt: string;
}

export interface SocialStoryContent {
  title: string;
  introduction: string;
  instructions: string;
  pages: Array<{
    id: string;
    order: number;
    text: string;
    sentenceType: string;
    imagePrompt: string;
    parentNote: string;
  }>;
  comprehensionQuestions: Array<{ question: string; expectedAnswer: string }>;
  tips: string[];
  notesPrompt: string;
}

export interface EmotionThermometerContent {
  title: string;
  introduction: string;
  instructions: string;
  levels: Array<{
    id: string;
    order: number;
    name: string;
    color: string;
    intensity: number;
    description: string;
    bodyCues: string[];
    emotionWords: string[];
    copingStrategies: string[];
    imagePrompt: string;
  }>;
  checkInScript: string;
  tips: string[];
  notesPrompt: string;
}

// Structured Plan content types
export interface WeeklyPlanContent {
  title: string;
  introduction: string;
  instructions: string;
  weeklyGoal: string;
  days: Array<{
    id: string;
    dayName: string;
    theme: string;
    activities: Array<{
      id: string;
      name: string;
      duration: string;
      domain: string;
      description: string;
      materials: string[];
      therapeuticGoal: string;
    }>;
  }>;
  progressTracking: {
    dailyCheckboxes: string[];
    weeklyReflection: string;
  };
  tips: string[];
  notesPrompt: string;
}

export interface DailyRoutineContent {
  title: string;
  introduction: string;
  instructions: string;
  timeBlocks: Array<{
    id: string;
    period: string;
    startTime: string;
    endTime: string;
    activity: {
      name: string;
      type: string;
      description: string;
      domain: string;
      visualCue: string;
      imagePrompt: string;
    };
    transitionWarning: string;
  }>;
  sensoryBreaks: Array<{
    name: string;
    duration: string;
    description: string;
    whenToUse: string;
  }>;
  tips: string[];
  notesPrompt: string;
}

export type AnyWorksheetContent =
  | WorksheetContent
  | VisualScheduleContent
  | SocialStoryContent
  | EmotionThermometerContent
  | WeeklyPlanContent
  | DailyRoutineContent;

interface GenerateParams {
  childAge: number;
  conditions: string[];
  developmentalNotes: string;
  subType: string;
  targetDomains: string[];
  difficulty: string;
  interests: string;
  duration: string;
  setting: string;
  specialInstructions: string;
  worksheetType: string;
  dataSource?: string;
  contextData?: Record<string, any>;
}

@Injectable()
export class WorksheetAiService {
  private readonly logger = new Logger(WorksheetAiService.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
    this.model = this.configService.get<string>(
      'ANTHROPIC_MODEL',
      'claude-sonnet-4-20250514',
    );
  }

  async generateWorksheetContent(params: GenerateParams): Promise<AnyWorksheetContent> {
    const { systemPrompt, userPrompt } = this.buildPrompts(params);

    this.logger.log(
      `Generating worksheet content: type=${params.worksheetType}, subType=${params.subType}, difficulty=${params.difficulty}`,
    );

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const content = this.parseJsonResponse(textBlock.text);
    this.validateContent(content, params.worksheetType, params.subType);

    this.logger.log(
      `Generated worksheet: "${content.title}" (${params.worksheetType}/${params.subType})`,
    );

    return content;
  }

  private buildPrompts(params: GenerateParams): { systemPrompt: string; userPrompt: string } {
    const baseParams = {
      childAge: params.childAge,
      conditions: params.conditions,
      developmentalNotes: params.developmentalNotes,
      targetDomains: params.targetDomains,
      difficulty: params.difficulty,
      interests: params.interests,
      duration: params.duration,
      setting: params.setting,
      specialInstructions: params.specialInstructions,
      subType: params.subType,
    };

    // Get data-source-specific context additions
    let contextAddition = '';
    if (params.contextData) {
      if (params.dataSource === 'SCREENING') {
        contextAddition = buildScreeningContextPrompt(params.contextData);
      } else if (params.dataSource === 'IEP_GOALS') {
        contextAddition = buildIEPGoalsContextPrompt(params.contextData);
      } else if (params.dataSource === 'UPLOADED_REPORT') {
        contextAddition = buildReportContextPrompt(params.contextData);
      } else if (params.dataSource === 'SESSION_NOTES') {
        contextAddition = buildSessionNotesContextPrompt(params.contextData);
      }
    }

    // Route to type-specific prompts
    let systemPrompt: string;
    let userPrompt: string;

    switch (params.worksheetType) {
      case 'VISUAL_SUPPORT':
        switch (params.subType) {
          case 'visual_schedule':
            systemPrompt = buildVisualScheduleSystemPrompt();
            userPrompt = buildVisualSchedulePrompt(baseParams);
            break;
          case 'social_story':
            systemPrompt = buildSocialStorySystemPrompt();
            userPrompt = buildSocialStoryPrompt(baseParams);
            break;
          case 'emotion_thermometer':
            systemPrompt = buildEmotionThermometerSystemPrompt();
            userPrompt = buildEmotionThermometerPrompt(baseParams);
            break;
          default:
            systemPrompt = buildVisualScheduleSystemPrompt();
            userPrompt = buildVisualSchedulePrompt(baseParams);
        }
        break;

      case 'STRUCTURED_PLAN':
        switch (params.subType) {
          case 'weekly_plan':
            systemPrompt = buildWeeklyPlanSystemPrompt();
            userPrompt = buildWeeklyPlanPrompt(baseParams);
            break;
          case 'daily_routine':
            systemPrompt = buildDailyRoutineSystemPrompt();
            userPrompt = buildDailyRoutinePrompt(baseParams);
            break;
          default:
            systemPrompt = buildWeeklyPlanSystemPrompt();
            userPrompt = buildWeeklyPlanPrompt(baseParams);
        }
        break;

      case 'ACTIVITY':
      default:
        systemPrompt = buildWorksheetSystemPrompt();
        userPrompt = buildWorksheetUserPrompt(baseParams);
        break;
    }

    // Append data source context to user prompt
    if (contextAddition) {
      userPrompt += contextAddition;
    }

    return { systemPrompt, userPrompt };
  }

  async regenerateSection(
    existingContent: Record<string, any>,
    sectionId: string,
    instructions?: string,
  ): Promise<WorksheetSection> {
    const prompt = buildSectionRegenerationPrompt({
      existingContent,
      sectionId,
      instructions,
    });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: buildWorksheetSystemPrompt(),
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return this.parseJsonResponse(textBlock.text);
  }

  private parseJsonResponse(text: string): any {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error(`Failed to parse AI response as JSON: ${error.message}`);
      this.logger.debug(`Raw response: ${text.substring(0, 500)}`);
      throw new Error('Failed to parse AI-generated content. Please try again.');
    }
  }

  private validateContent(content: any, worksheetType: string, subType: string): void {
    if (!content.title || typeof content.title !== 'string') {
      throw new Error('Invalid worksheet content: missing title');
    }

    switch (worksheetType) {
      case 'VISUAL_SUPPORT':
        this.validateVisualSupportContent(content, subType);
        break;
      case 'STRUCTURED_PLAN':
        this.validateStructuredPlanContent(content, subType);
        break;
      case 'ACTIVITY':
      default:
        this.validateActivityContent(content);
        break;
    }
  }

  private validateActivityContent(content: any): asserts content is WorksheetContent {
    if (!content.sections || !Array.isArray(content.sections)) {
      throw new Error('Invalid worksheet content: missing sections');
    }
    if (content.sections.length === 0) {
      throw new Error('Invalid worksheet content: empty sections');
    }
    for (const section of content.sections) {
      if (!section.activities || !Array.isArray(section.activities)) {
        throw new Error(
          `Invalid worksheet content: section "${section.title}" has no activities`,
        );
      }
    }
  }

  private validateVisualSupportContent(content: any, subType: string): void {
    switch (subType) {
      case 'visual_schedule':
        if (!content.steps || !Array.isArray(content.steps) || content.steps.length === 0) {
          throw new Error('Invalid visual schedule: missing steps');
        }
        break;
      case 'social_story':
        if (!content.pages || !Array.isArray(content.pages) || content.pages.length === 0) {
          throw new Error('Invalid social story: missing pages');
        }
        break;
      case 'emotion_thermometer':
        if (!content.levels || !Array.isArray(content.levels) || content.levels.length === 0) {
          throw new Error('Invalid emotion thermometer: missing levels');
        }
        break;
    }
  }

  private validateStructuredPlanContent(content: any, subType: string): void {
    switch (subType) {
      case 'weekly_plan':
        if (!content.days || !Array.isArray(content.days) || content.days.length === 0) {
          throw new Error('Invalid weekly plan: missing days');
        }
        break;
      case 'daily_routine':
        if (!content.timeBlocks || !Array.isArray(content.timeBlocks) || content.timeBlocks.length === 0) {
          throw new Error('Invalid daily routine: missing timeBlocks');
        }
        break;
    }
  }
}
