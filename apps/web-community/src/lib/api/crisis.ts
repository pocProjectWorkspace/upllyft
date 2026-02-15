import { apiClient } from '@upllyft/api-client';

export interface CrisisResource {
  id: string;
  name: string;
  description: string;
  type: string;
  phone?: string;
  website?: string;
  chatUrl?: string;
  availability: string;
  state?: string;
  city?: string;
  language?: string;
  isEmergency: boolean;
}

export interface EmergencyContacts {
  helpline: string;
  textLine: string;
  emergency: string;
}

export interface CrisisDetectionResult {
  detected: boolean;
  type?: string;
  keywords: string[];
  confidence: number;
  suggestedAction?: string;
  showResources: boolean;
}

export interface CrisisResourceFilters {
  type?: string;
  state?: string;
  city?: string;
  language?: string;
}

export async function getCrisisResources(filters?: CrisisResourceFilters): Promise<CrisisResource[]> {
  const { data } = await apiClient.get('/crisis/resources', { params: filters });
  return data;
}

export async function getEmergencyContacts(): Promise<EmergencyContacts> {
  const { data } = await apiClient.get('/crisis/resources/emergency');
  return data;
}

export async function detectCrisis(content: string): Promise<CrisisDetectionResult> {
  const { data } = await apiClient.post('/crisis/detect', { content });
  return data;
}

// --- Incidents ---

export interface CrisisIncident {
  id: string;
  type: string;
  urgencyLevel: string;
  status: 'ACTIVE' | 'IN_PROGRESS' | 'RESOLVED';
  description?: string;
  location?: string;
  contactNumber?: string;
  connections?: { id: string }[];
  followupScheduled?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentDto {
  type: string;
  urgencyLevel: string;
  description?: string;
  location?: string;
  contactNumber?: string;
  preferredLang?: string;
}

export interface IncidentResponse {
  incident: CrisisIncident;
  resources: CrisisResource[];
  nextSteps: string[];
}

export async function createCrisisIncident(dto: CreateIncidentDto): Promise<IncidentResponse> {
  const { data } = await apiClient.post('/crisis/incident', dto);
  return data;
}

export async function getMyCrisisIncidents(): Promise<CrisisIncident[]> {
  const { data } = await apiClient.get('/crisis/incidents/my');
  return data;
}
