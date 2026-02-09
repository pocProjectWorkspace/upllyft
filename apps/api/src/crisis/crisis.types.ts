// apps/api/src/crisis/crisis.types.ts

// Re-export enums from DTOs
export { 
  CrisisType, 
  UrgencyLevel, 
  CrisisStatus 
} from './dto/create-crisis-incident.dto';

// Export detection result
export type { DetectionResult } from './crisis-detection.service';

// Define Prisma-compatible types without importing from @prisma/client
export interface CrisisIncident {
  id: string;
  userId: string;
  type: string;
  urgencyLevel: string;
  description?: string | null;
  location?: string | null;
  contactNumber?: string | null;
  preferredLang: string;
  status: string;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  resourcesUsed: string[];
  volunteerId?: string | null;
  followupScheduled?: Date | null;
  followupCompleted: boolean;
  triggerKeywords: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisResource {
  id: string;
  name: string;
  type: string;
  category: string[];
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  website?: string | null;
  available24x7: boolean;
  operatingHours?: string | null;
  languages: string[];
  country: string;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  address?: string | null;
  priority: number;
  isVerified: boolean;
  verifiedAt?: Date | null;
  usageCount: number;
  avgRating?: number | null;
  description?: string | null;
  specialization: string[];
  ageGroups: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisVolunteer {
  id: string;
  userId: string;
  trainingCompleted: boolean;
  certifications: string[];
  specializations: string[];
  languages: string[];
  isAvailable: boolean;
  availableFrom?: Date | null;
  availableTill?: Date | null;
  maxCasesPerDay: number;
  currentCases: number;
  state: string;
  city: string;
  timezone: string;
  casesHandled: number;
  avgRating?: number | null;
  isActive: boolean;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisConnection {
  id: string;
  incidentId: string;
  volunteerId?: string | null;
  resourceId?: string | null;
  connectionType: string;
  startedAt: Date;
  endedAt?: Date | null;
  duration?: number | null;
  outcome?: string | null;
  notes?: string | null;
  rating?: number | null;
  feedback?: string | null;
  createdAt: Date;
}

export interface CrisisLog {
  id: string;
  incidentId: string;
  action: string;
  details?: any;
  performedBy?: string | null;
  createdAt: Date;
}