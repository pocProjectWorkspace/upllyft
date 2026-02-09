// apps/api/src/crisis/dto/crisis-response.dto.ts

import { CrisisType } from './create-crisis-incident.dto';

// Define response types without Prisma imports
export interface CrisisIncidentResponse {
  id: string;
  userId: string;
  type: CrisisType;
  urgencyLevel: string;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisResourceResponse {
  id: string;
  name: string;
  type: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  available24x7: boolean;
  languages: string[];
}

export class CrisisIncidentResponseDto {
  incident: CrisisIncidentResponse;
  resources: CrisisResourceResponse[];
  volunteer?: any;
  nextSteps: string[];
  emergencyContacts?: {
    name: string;
    number: string;
    available24x7: boolean;
  }[];
}

export class CrisisDetectionResultDto {
  detected: boolean;
  type?: CrisisType;
  keywords: string[];
  confidence: number;
  suggestedAction?: string;
  showResources: boolean;
}