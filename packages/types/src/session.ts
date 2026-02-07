export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export interface Therapist {
  id: string;
  userId: string;
  specializations: string[];
  bio?: string;
  hourlyRate?: number;
  rating?: number;
  reviewCount?: number;
}

export interface Session {
  id: string;
  therapistId: string;
  parentId: string;
  childId: string;
  scheduledAt: string;
  duration: number;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  session: Session;
  therapist: Therapist;
}
