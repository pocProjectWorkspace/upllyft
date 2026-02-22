export interface MiraCard {
  type: 'therapist' | 'community' | 'organisation' | 'evidence' | 'conversation' | 'screening_prompt';
  data: any;
}

export interface MiraAction {
  label: string;
  url: string;
  type: 'booking' | 'community' | 'screening' | 'resource' | 'insight';
}

export interface MiraResponse {
  text: string;
  cards?: MiraCard[];
  choices?: string[];
  actions?: MiraAction[];
  sentiment?: 'supportive' | 'informational' | 'encouraging' | 'concerned';
}

export interface ChatDto {
  message: string;
  conversationId?: string;
  childId?: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  lastMessage: string;
  updatedAt: Date;
  childId: string | null;
}

export interface ScribeDto {
  sessionId: string;
}

export interface ScribeResponse {
  soapSubjective: string;
  soapObjective: string;
  soapAssessment: string;
  soapPlan: string;
}
