export enum SessionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export interface Availability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface TherapistProfile {
  id: string;
  userId: string;
  specialty: string[];
  bio: string;
  qualifications: string[];
  experience: number;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  availability: Availability[];
}

export interface Session {
  id: string;
  therapistId: string;
  patientId: string;
  childId?: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  type: string;
  price: number;
  notes?: string;
  meetingLink?: string;
}

export interface Booking extends Session {
  therapist: TherapistProfile;
  patient: {
    id: string;
    name: string;
    avatar?: string;
  };
}
