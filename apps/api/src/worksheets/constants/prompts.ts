import { ACTIVITY_SUB_TYPES } from './activity-types';
import { VISUAL_SUPPORT_SUB_TYPES } from './visual-support-types';
import { STRUCTURED_PLAN_SUB_TYPES } from './structured-plan-types';
import { DEVELOPMENTAL_DOMAINS } from './domains';

// ─── Shared Helpers ──────────────────────────────────────────

function formatAge(ageMonths: number): string {
  const ageYears = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (ageYears > 0) {
    return `${ageYears} year${ageYears > 1 ? 's' : ''}${months > 0 ? ` ${months} month${months > 1 ? 's' : ''}` : ''}`;
  }
  return `${months} month${months > 1 ? 's' : ''}`;
}

function formatDomains(targetDomains: string[]): string {
  return targetDomains
    .map((d) => DEVELOPMENTAL_DOMAINS[d as keyof typeof DEVELOPMENTAL_DOMAINS]?.label ?? d)
    .join(', ');
}

const DURATION_MAP: Record<string, string> = {
  '5min': '5 minutes',
  '10min': '10 minutes',
  '15min': '15 minutes',
  '20plus': '20+ minutes',
};

interface BaseParams {
  childAge: number;
  conditions: string[];
  developmentalNotes: string;
  targetDomains: string[];
  difficulty: string;
  interests: string;
  duration: string;
  setting: string;
  specialInstructions: string;
}

function buildChildProfileBlock(params: BaseParams): string {
  return `CHILD PROFILE:
- Age: ${formatAge(params.childAge)} (${params.childAge} months)
- Conditions: ${params.conditions.length > 0 ? params.conditions.join(', ') : 'Not specified'}
- Developmental notes: ${params.developmentalNotes || 'None provided'}`;
}

function buildParamsBlock(params: BaseParams, typeLabel: string): string {
  return `WORKSHEET PARAMETERS:
- Type: ${typeLabel}
- Target developmental domains: ${formatDomains(params.targetDomains)}
- Difficulty level: ${params.difficulty}
- Child's interests: ${params.interests}
- Activity duration: ${DURATION_MAP[params.duration] ?? params.duration}
- Setting: ${params.setting}
${params.specialInstructions ? `- Special instructions: ${params.specialInstructions}` : ''}`;
}

// ─── Activity Worksheet Prompts (Phase 1) ────────────────────

export function buildWorksheetSystemPrompt(): string {
  return `You are an expert pediatric therapy worksheet designer specializing in evidence-based activities for neurodivergent children. You create engaging, therapeutically-grounded activity worksheets that parents and therapists can use at home, in clinics, or in schools.

Your worksheets are:
- Evidence-based and aligned with occupational therapy, speech-language pathology, ABA, and sensory integration best practices
- Age-appropriate and calibrated to the child's developmental level
- Engaging by incorporating the child's interests into activities naturally
- Practical with clear, parent-friendly instructions and realistic material requirements
- Inclusive with adaptations for making activities easier or harder

You MUST respond with valid JSON matching the exact schema provided. Do not include any text outside the JSON.`;
}

export function buildWorksheetUserPrompt(params: BaseParams & { subType: string }): string {
  const subTypeInfo =
    ACTIVITY_SUB_TYPES[params.subType as keyof typeof ACTIVITY_SUB_TYPES];

  return `Generate a ${subTypeInfo?.label ?? params.subType} activity worksheet with the following parameters:

${buildChildProfileBlock(params)}

${buildParamsBlock(params, subTypeInfo?.label ?? params.subType)}

Respond with a JSON object matching this EXACT schema:
{
  "title": "string — engaging worksheet title incorporating the child's interests",
  "introduction": "string — 1-2 sentences explaining the worksheet's purpose for parents",
  "instructions": "string — clear step-by-step directions for the parent/therapist facilitating the activities",
  "sections": [
    {
      "id": "string — unique section identifier like 'section_1'",
      "title": "string — section heading",
      "description": "string — brief overview of this section",
      "activities": [
        {
          "id": "string — unique activity identifier like 'activity_1_1'",
          "name": "string — activity name",
          "instructions": "string — step-by-step instructions for the activity",
          "materials": ["string array — materials needed, use common household items"],
          "therapeuticRationale": "string — brief explanation of why this activity helps development",
          "adaptations": {
            "easier": "string — how to simplify for children who need more support",
            "harder": "string — how to increase challenge for children ready for more"
          },
          "imagePrompt": "string — description of an illustration for this activity (what the image should show, NOT a DALL-E prompt)"
        }
      ]
    }
  ],
  "tips": ["string array — 3-5 practical tips for success"],
  "notesPrompt": "string — guidance for parents on what to observe and note during the activity"
}

Guidelines:
- Create 2-4 sections with 1-3 activities each, fitting the ${DURATION_MAP[params.duration] ?? params.duration} time frame
- Activities must be feasible in a ${params.setting.toLowerCase()} setting
- Materials should be common household items or easily accessible
- Weave "${params.interests}" naturally into activities without forcing it
- Each activity must have a clear therapeutic rationale
- Difficulty should match ${params.difficulty} level:
  - FOUNDATIONAL: Basic skills, maximum support, simple 1-2 step activities
  - DEVELOPING: Building skills, moderate support, 2-3 step activities
  - STRENGTHENING: Refining skills, minimal support, multi-step activities with some independence`;
}

// ─── Screening-Informed Prompt Addition ──────────────────────

export function buildScreeningContextPrompt(contextData: Record<string, any>): string {
  if (!contextData?.domainScores) return '';

  const scores = contextData.domainScores as Array<{
    domain: string;
    score: number;
    maxScore: number;
    flagged: boolean;
  }>;

  const flagged = scores.filter((s) => s.flagged);
  const strong = scores.filter((s) => !s.flagged && s.score / s.maxScore > 0.7);

  let prompt = '\nSCREENING DATA CONTEXT:';
  if (flagged.length > 0) {
    prompt += `\n- Areas needing support: ${flagged.map((s) => `${s.domain} (${s.score}/${s.maxScore})`).join(', ')}`;
  }
  if (strong.length > 0) {
    prompt += `\n- Relative strengths: ${strong.map((s) => `${s.domain} (${s.score}/${s.maxScore})`).join(', ')}`;
  }
  prompt += '\n- Design activities that leverage strengths while building skills in flagged areas.';

  return prompt;
}

// ─── IEP Goals Prompt Addition ───────────────────────────────

export function buildIEPGoalsContextPrompt(contextData: Record<string, any>): string {
  if (!contextData?.goals) return '';

  const goals = contextData.goals as Array<{
    domain: string;
    goalText: string;
    currentProgress: number;
  }>;

  let prompt = '\nIEP GOALS CONTEXT:';
  prompt += '\nDesign activities that directly target these IEP goals:';
  goals.forEach((g, i) => {
    prompt += `\n${i + 1}. [${g.domain}] ${g.goalText} (current progress: ${g.currentProgress}%)`;
  });
  prompt += '\n- Each activity should explicitly address at least one goal.';
  prompt += '\n- Reference specific goal targets in the therapeutic rationale.';

  return prompt;
}

// ─── Report-Based Prompt Addition ────────────────────────────

export function buildReportContextPrompt(contextData: Record<string, any>): string {
  if (!contextData?.parsedReport) return '';

  const report = contextData.parsedReport;
  let prompt = '\nPARSED REPORT CONTEXT:';
  if (report.strengths?.length) {
    prompt += `\n- Strengths: ${report.strengths.join(', ')}`;
  }
  if (report.challenges?.length) {
    prompt += `\n- Challenges: ${report.challenges.join(', ')}`;
  }
  if (report.recommendations?.length) {
    prompt += `\n- Recommendations: ${report.recommendations.join(', ')}`;
  }
  if (report.domains?.length) {
    prompt += '\n- Domain observations:';
    report.domains.forEach((d: any) => {
      prompt += `\n  - ${d.name}: ${d.observations}${d.level ? ` (Level: ${d.level})` : ''}`;
    });
  }
  prompt += '\n- Design activities that address the recommendations and support identified challenges while building on strengths.';

  return prompt;
}

// ─── Session Notes Prompt Addition ───────────────────────────

export function buildSessionNotesContextPrompt(contextData: Record<string, any>): string {
  if (!contextData?.sessions) return '';

  const sessions = contextData.sessions as Array<{
    date: string;
    aiSummary?: string;
    rawNotes?: string;
    goalProgress?: Array<{
      domain: string;
      goalText: string;
      progressNote: string;
      progressValue: number;
    }>;
  }>;

  let prompt = '\nSESSION NOTES CONTEXT:';
  prompt += `\nBased on ${sessions.length} recent therapy session(s):`;

  sessions.forEach((s, i) => {
    prompt += `\n\nSession ${i + 1} (${s.date}):`;
    if (s.aiSummary) {
      prompt += `\n- Summary: ${s.aiSummary}`;
    } else if (s.rawNotes) {
      prompt += `\n- Notes: ${s.rawNotes.substring(0, 500)}`;
    }
    if (s.goalProgress?.length) {
      prompt += '\n- Goal progress:';
      s.goalProgress.forEach((gp) => {
        prompt += `\n  - [${gp.domain}] ${gp.goalText}: ${gp.progressNote} (${gp.progressValue}%)`;
      });
    }
  });

  prompt += '\n\n- Design activities that reinforce concepts and skills practiced in recent sessions.';
  prompt += '\n- Address areas where progress has been slow or where therapist notes suggest more practice is needed.';
  prompt += '\n- Build on session successes to maintain momentum.';

  return prompt;
}

// ─── Visual Support Prompts ──────────────────────────────────

export function buildVisualScheduleSystemPrompt(): string {
  return `You are an expert in creating visual supports for neurodivergent children. You specialize in creating visual schedules that break complex routines into clear, sequential steps with visual cues. Your visual schedules follow TEACCH structured teaching principles and are designed to promote independence and reduce anxiety.

You MUST respond with valid JSON matching the exact schema provided. Do not include any text outside the JSON.`;
}

export function buildVisualSchedulePrompt(params: BaseParams & { subType: string }): string {
  return `Generate a visual schedule with the following parameters:

${buildChildProfileBlock(params)}

${buildParamsBlock(params, 'Visual Schedule')}

Respond with a JSON object matching this EXACT schema:
{
  "title": "string — descriptive schedule title (e.g., 'Morning Routine Schedule')",
  "introduction": "string — 1-2 sentences for the parent about how to use this schedule",
  "instructions": "string — directions for implementing the visual schedule",
  "steps": [
    {
      "id": "string — unique step identifier like 'step_1'",
      "order": number,
      "label": "string — short step label (2-4 words)",
      "description": "string — clear description of what to do in this step",
      "duration": "string — approximate time (e.g., '5 minutes')",
      "visualCue": "string — description of the visual icon/image for this step",
      "imagePrompt": "string — description of illustration for this step",
      "supportTip": "string — tip for supporting the child through this step"
    }
  ],
  "transitionStrategies": ["string array — 3-4 strategies for transitions between steps"],
  "tips": ["string array — 3-5 tips for successful use"],
  "notesPrompt": "string — what to observe"
}

Guidelines:
- Create 6-10 sequential steps appropriate for the routine/activity
- Each step should be simple and concrete
- Visual cues should be easy to illustrate (simple icons or scenes)
- Include clear transition strategies between steps
- Consider sensory needs and self-regulation opportunities`;
}

export function buildSocialStorySystemPrompt(): string {
  return `You are an expert in creating Carol Gray Social Stories\u2122 for neurodivergent children. Your social stories follow the official Social Story criteria:
- Ratio: at least 2 descriptive/perspective/affirmative sentences for every 1 directive sentence
- Written in first or third person
- Positive tone and coaching approach
- Accurate, honest, and reassuring

You MUST respond with valid JSON matching the exact schema provided. Do not include any text outside the JSON.`;
}

export function buildSocialStoryPrompt(params: BaseParams & { subType: string }): string {
  return `Generate a social story with the following parameters:

${buildChildProfileBlock(params)}

${buildParamsBlock(params, 'Social Story')}

Respond with a JSON object matching this EXACT schema:
{
  "title": "string — social story title (e.g., 'Going to the Grocery Store')",
  "introduction": "string — parent guidance for reading this story with the child",
  "instructions": "string — how to use this social story effectively",
  "pages": [
    {
      "id": "string — unique page identifier like 'page_1'",
      "order": number,
      "text": "string — the social story text for this page (1-3 sentences)",
      "sentenceType": "descriptive" | "perspective" | "affirmative" | "directive" | "cooperative",
      "imagePrompt": "string — description of the full-page illustration for this page",
      "parentNote": "string — optional tip for the parent while reading this page"
    }
  ],
  "comprehensionQuestions": [
    {
      "question": "string — simple question to check understanding",
      "expectedAnswer": "string — expected response"
    }
  ],
  "tips": ["string array — 3-5 tips for reading social stories effectively"],
  "notesPrompt": "string — what to observe about the child's response"
}

Guidelines:
- Create 6-10 pages following Carol Gray's sentence ratio
- Use simple, concrete language appropriate for the child's age
- Include descriptive, perspective, and affirmative sentences primarily
- Keep directive sentences to a minimum (no more than 1/3 of total)
- Each page should have a clear, illustratable scene
- Include 2-3 simple comprehension questions`;
}

export function buildEmotionThermometerSystemPrompt(): string {
  return `You are an expert in creating emotion regulation tools for neurodivergent children. You specialize in creating emotion thermometers (also called emotion scales or zones) that help children identify, understand, and manage their emotional states. Your tools are grounded in Zones of Regulation and Interoception-based approaches.

You MUST respond with valid JSON matching the exact schema provided. Do not include any text outside the JSON.`;
}

export function buildEmotionThermometerPrompt(params: BaseParams & { subType: string }): string {
  return `Generate an emotion thermometer tool with the following parameters:

${buildChildProfileBlock(params)}

${buildParamsBlock(params, 'Emotion Thermometer')}

Respond with a JSON object matching this EXACT schema:
{
  "title": "string — thermometer title (e.g., 'My Feelings Thermometer')",
  "introduction": "string — parent guidance for using this tool",
  "instructions": "string — step-by-step instructions for using the thermometer",
  "levels": [
    {
      "id": "string — unique level identifier like 'level_1'",
      "order": number,
      "name": "string — emotion level name (e.g., 'Calm', 'Worried', 'Upset')",
      "color": "string — color for this level (e.g., 'green', 'yellow', 'orange', 'red', 'dark red')",
      "intensity": number,
      "description": "string — what this level feels like in the body",
      "bodyCues": ["string array — physical sensations at this level"],
      "emotionWords": ["string array — emotion words for this level"],
      "copingStrategies": ["string array — 2-3 coping strategies appropriate for this level"],
      "imagePrompt": "string — illustration description for this level"
    }
  ],
  "checkInScript": "string — a simple script for doing an emotion check-in with the child",
  "tips": ["string array — 3-5 tips for using emotion tools effectively"],
  "notesPrompt": "string — what to observe about emotion regulation"
}

Guidelines:
- Create exactly 5 levels from calm (1) to extremely upset (5)
- Body cues should be concrete and physical (not abstract)
- Coping strategies must be age-appropriate and practical
- Use the child's interests in the coping strategies where possible
- Colors should progress from cool to warm (green → red)`;
}

// ─── Structured Plan Prompts ─────────────────────────────────

export function buildWeeklyPlanSystemPrompt(): string {
  return `You are an expert pediatric therapy planner specializing in creating structured weekly activity plans for neurodivergent children. Your plans balance therapeutic goals with fun engagement, incorporate the child's interests, and provide consistent daily structure. Plans follow evidence-based home program design principles.

You MUST respond with valid JSON matching the exact schema provided. Do not include any text outside the JSON.`;
}

export function buildWeeklyPlanPrompt(params: BaseParams & { subType: string }): string {
  return `Generate a weekly activity plan with the following parameters:

${buildChildProfileBlock(params)}

${buildParamsBlock(params, 'Weekly Plan')}

Respond with a JSON object matching this EXACT schema:
{
  "title": "string — engaging plan title (e.g., 'Dinosaur Adventure Week')",
  "introduction": "string — overview for parents about this week's therapeutic focus",
  "instructions": "string — how to use the weekly plan",
  "weeklyGoal": "string — the overarching therapeutic goal for the week",
  "days": [
    {
      "id": "string — e.g., 'monday'",
      "dayName": "string — day of the week",
      "theme": "string — optional daily theme incorporating interests",
      "activities": [
        {
          "id": "string — unique activity id",
          "name": "string — activity name",
          "duration": "string — time needed",
          "domain": "string — primary developmental domain targeted",
          "description": "string — brief activity description",
          "materials": ["string array"],
          "therapeuticGoal": "string — what this activity targets"
        }
      ]
    }
  ],
  "progressTracking": {
    "dailyCheckboxes": ["string array — items to check off each day"],
    "weeklyReflection": "string — prompt for end-of-week reflection"
  },
  "tips": ["string array — 3-5 tips for maintaining the weekly routine"],
  "notesPrompt": "string — what to observe throughout the week"
}

Guidelines:
- Create activities for all 7 days (Monday through Sunday)
- 2-3 activities per day, varying the targeted domains across the week
- Keep individual activities within the ${DURATION_MAP[params.duration] ?? params.duration} time frame
- Weekend activities can be more flexible/fun while still therapeutic
- Include the child's interests ("${params.interests}") as daily themes
- Each day should target different domains for balanced development`;
}

export function buildDailyRoutineSystemPrompt(): string {
  return `You are an expert in creating structured daily routines for neurodivergent children. You design time-blocked schedules that balance therapeutic activities, daily living tasks, and downtime. Your routines incorporate visual supports, transition warnings, and sensory breaks. They follow structured teaching principles while remaining flexible enough for real family life.

You MUST respond with valid JSON matching the exact schema provided. Do not include any text outside the JSON.`;
}

export function buildDailyRoutinePrompt(params: BaseParams & { subType: string }): string {
  return `Generate a daily routine plan with the following parameters:

${buildChildProfileBlock(params)}

${buildParamsBlock(params, 'Daily Routine')}

Respond with a JSON object matching this EXACT schema:
{
  "title": "string — routine title (e.g., 'My Super Day Plan')",
  "introduction": "string — parent guidance for implementing this routine",
  "instructions": "string — how to use this daily routine",
  "timeBlocks": [
    {
      "id": "string — unique block id like 'block_morning_1'",
      "period": "morning" | "afternoon" | "evening",
      "startTime": "string — approximate start time (e.g., '7:00 AM')",
      "endTime": "string — approximate end time",
      "activity": {
        "name": "string — activity name",
        "type": "routine" | "therapeutic" | "play" | "rest" | "transition",
        "description": "string — what to do",
        "domain": "string — developmental domain if therapeutic",
        "visualCue": "string — visual cue description for the schedule",
        "imagePrompt": "string — illustration description"
      },
      "transitionWarning": "string — how to signal the upcoming transition"
    }
  ],
  "sensoryBreaks": [
    {
      "name": "string — break name",
      "duration": "string — how long",
      "description": "string — what to do",
      "whenToUse": "string — signs that a break is needed"
    }
  ],
  "tips": ["string array — 3-5 tips for routine implementation"],
  "notesPrompt": "string — what to observe during the day"
}

Guidelines:
- Create 8-12 time blocks covering morning, afternoon, and evening
- Include a mix of routine (meals, hygiene), therapeutic, play, and rest blocks
- Add transition warnings between each block
- Include 2-3 sensory break options that can be inserted anywhere
- Time blocks should be realistic for the child's age
- Incorporate "${params.interests}" into play and therapeutic blocks`;
}

// ─── DALL-E 3 Image Generation ───────────────────────────────

const COLOR_MODE_INSTRUCTIONS: Record<string, string> = {
  FULL_COLOR:
    'Vibrant, colorful illustration with soft pastel tones suitable for children.',
  GRAYSCALE:
    'Grayscale illustration suitable for standard black-and-white printing.',
  LINE_ART:
    'Black and white line art, coloring-book style with clean outlines. No shading or fills.',
};

export function buildImagePrompt(params: {
  activityImagePrompt: string;
  interests: string;
  setting: string;
  ageMonths: number;
  colorMode: string;
}): string {
  const ageYears = Math.floor(params.ageMonths / 12);
  const ageRange =
    ageYears <= 3
      ? 'toddlers (1-3 years)'
      : ageYears <= 6
        ? 'preschoolers (3-6 years)'
        : ageYears <= 9
          ? 'early elementary children (6-9 years)'
          : 'school-age children (9-12 years)';

  const colorInstruction =
    COLOR_MODE_INSTRUCTIONS[params.colorMode] ??
    COLOR_MODE_INSTRUCTIONS.FULL_COLOR;

  return `Simple, child-friendly illustration for an educational activity worksheet. ${params.activityImagePrompt}. The scene is set in a ${params.setting.toLowerCase()} environment. Style: clean, warm, friendly, age-appropriate for ${ageRange}. Theme elements: ${params.interests}. ${colorInstruction} Safe for children, educational context. No text or words in the image.`;
}

// ─── Section Regeneration ────────────────────────────────────

export function buildSectionRegenerationPrompt(params: {
  existingContent: Record<string, any>;
  sectionId: string;
  instructions?: string;
}): string {
  return `You previously generated a worksheet with the following content:
${JSON.stringify(params.existingContent, null, 2)}

Regenerate ONLY the section with id "${params.sectionId}". ${params.instructions ? `Additional instructions: ${params.instructions}` : 'Make it different from the current version while maintaining the same therapeutic goals and difficulty level.'}

Respond with a JSON object containing ONLY the regenerated section, matching the same schema as the original section.`;
}
