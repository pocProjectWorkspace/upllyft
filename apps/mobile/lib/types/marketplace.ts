export interface TherapistProfile {
  id: string;
  userId: string;
  bio: string | null;
  credentials: string[];
  specializations: string[];
  yearsExperience: number | null;
  title: string | null;
  profileImage: string | null;
  languages: string[];
  overallRating: number;
  totalSessions: number;
  totalRatings: number;
  isActive: boolean;
  acceptingBookings: boolean;
  user: { id: string; name: string | null; email: string; image: string | null };
  sessionTypes?: SessionType[];
}

export interface SessionType {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  defaultPrice: number;
  currency: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface Booking {
  id: string;
  patientId: string;
  therapistId: string;
  sessionTypeId: string;
  startDateTime: string;
  endDateTime: string;
  timezone: string;
  duration: number;
  status: string;
  subtotal: number;
  currency: string;
  googleMeetLink: string | null;
  patientNotes: string | null;
  createdAt: string;
  therapist?: { user: { name: string | null; image: string | null } };
  sessionType?: SessionType;
}

export interface SessionRating {
  id: string;
  rating: number;
  review: string | null;
  createdAt: string;
  ratedBy: string;
}
