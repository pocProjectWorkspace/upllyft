import { apiClient } from '@upllyft/api-client';

// --- Types ---

export type ClinicStatus = 'INTAKE' | 'ACTIVE' | 'ON_HOLD' | 'DISCHARGED';

export interface PatientListItem {
  id: string;
  firstName: string;
  nickname: string | null;
  dateOfBirth: string;
  gender: string;
  clinicStatus: ClinicStatus;
  createdAt: string;
  conditions: { type: string; severity: string | null }[];
  parent: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
  } | null;
  assignedTherapist: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  activeCaseCount: number;
  lastActivity: string | null;
  latestScreening: {
    status: string;
    completedAt: string | null;
    overallScore: number | null;
  } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PatientDetail {
  id: string;
  firstName: string;
  nickname: string | null;
  dateOfBirth: string;
  gender: string;
  clinicStatus: ClinicStatus;
  createdAt: string;
  demographics: {
    address: string | null;
    city: string | null;
    state: string | null;
    nationality: string | null;
    primaryLanguage: string | null;
    schoolType: string | null;
    grade: string | null;
    currentSchool: string | null;
  };
  health: {
    hasCondition: boolean;
    diagnosisStatus: string | null;
    conditions: any[];
    takingMedications: boolean | null;
    medicationDetails: string | null;
    developmentalConcerns: string | null;
    delayedMilestones: boolean | null;
    delayedMilestonesDetails: string | null;
  };
  parent: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
  } | null;
  parentProfile: {
    fullName: string | null;
    phoneNumber: string | null;
    alternatePhone: string | null;
    email: string | null;
    relationshipToChild: string | null;
  } | null;
  cases: {
    id: string;
    caseNumber: string;
    status: string;
    diagnosis: string | null;
    openedAt: string;
    primaryTherapist: {
      id: string;
      name: string;
      avatar: string | null;
      specialization: string[];
    } | null;
    therapists: { id: string; name: string; role: string }[];
    goalCount: number;
    sessions: {
      id: string;
      scheduledAt: string;
      attendanceStatus: string;
      sessionType: string | null;
      noteFormat: string | null;
      therapist: { id: string; name: string } | null;
    }[];
  }[];
  assessments: {
    id: string;
    status: string;
    overallScore: number | null;
    domainScores: any;
    flaggedDomains: string[];
    completedAt: string | null;
    createdAt: string;
    hasReport: boolean;
  }[];
  latestMiraConversation: {
    id: string;
    title: string | null;
    updatedAt: string;
  } | null;
}

export interface TherapistOption {
  id: string;
  therapistProfileId: string;
  name: string;
  email: string;
  avatar: string | null;
  specializations: string[];
  title: string | null;
}

export interface ListPatientsParams {
  search?: string;
  status?: string;
  therapistId?: string;
  ageMin?: number;
  ageMax?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// --- API Functions ---

export async function getPatients(params: ListPatientsParams = {}): Promise<PaginatedResponse<PatientListItem>> {
  const { data } = await apiClient.get('/api/admin/patients', { params });
  return data;
}

export async function getPatientDetail(childId: string): Promise<PatientDetail> {
  const { data } = await apiClient.get(`/api/admin/patients/${childId}`);
  return data;
}

export async function updatePatientStatus(childId: string, status: string): Promise<any> {
  const { data } = await apiClient.patch(`/api/admin/patients/${childId}`, { status });
  return data;
}

export async function assignTherapist(
  childId: string,
  therapistId: string,
  opts?: { diagnosis?: string; notes?: string },
): Promise<any> {
  const { data } = await apiClient.post(`/api/admin/patients/${childId}/assign`, {
    therapistId,
    ...opts,
  });
  return data;
}

export async function getTherapists(): Promise<TherapistOption[]> {
  const { data } = await apiClient.get('/api/admin/patients/therapists');
  return data;
}

// --- Therapist Directory Types ---

export type CredentialStatus = 'PENDING' | 'VERIFIED' | 'EXPIRED';
export type AvailabilityStatus = 'available' | 'busy' | 'off';

export interface TherapistListItem {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  avatar: string | null;
  phone: string | null;
  bio: string | null;
  title: string | null;
  specializations: string[];
  credentials: string[];
  yearsExperience: number | null;
  languages: string[];
  overallRating: number;
  totalSessions: number;
  acceptingBookings: boolean;
  credentialStatus: CredentialStatus;
  licenceNumber: string | null;
  licenceExpiry: string | null;
  activeCaseCount: number;
  todayAppointments: number;
  availabilityStatus: AvailabilityStatus;
  joinedAt: string;
}

export interface TherapistDetail {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  avatar: string | null;
  phone: string | null;
  bio: string | null;
  title: string | null;
  specializations: string[];
  credentials: string[];
  yearsExperience: number | null;
  languages: string[];
  defaultTimezone: string;
  overallRating: number;
  totalSessions: number;
  totalRatings: number;
  acceptingBookings: boolean;
  credentialStatus: CredentialStatus;
  licenceNumber: string | null;
  licenceExpiry: string | null;
  joinedAt: string;
  availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
  caseload: {
    caseId: string;
    caseNumber: string;
    status: string;
    diagnosis: string | null;
    openedAt: string;
    patient: {
      id: string;
      name: string;
      nickname: string | null;
      dateOfBirth: string;
      clinicStatus: ClinicStatus;
    };
    lastSession: {
      scheduledAt: string;
      attendanceStatus: string;
    } | null;
  }[];
  performance: {
    sessionsThisMonth: number;
    avgSessionsPerWeek: number;
    activeCases: number;
  };
}

export interface ScheduleAppointment {
  id: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  patient: {
    id: string;
    name: string | null;
    avatar: string | null;
  } | null;
  sessionType: string | null;
  timezone: string;
}

export interface ScheduleTherapist {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  appointments: ScheduleAppointment[];
}

export interface ConsolidatedSchedule {
  date: string;
  therapists: ScheduleTherapist[];
}

export interface ListTherapistsParams {
  search?: string;
  specialty?: string;
  availability?: AvailabilityStatus;
  credentialStatus?: CredentialStatus;
}

export interface ScheduleParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  therapistId?: string;
}

// --- Therapist Directory API Functions ---

export async function getTherapistDirectory(
  params: ListTherapistsParams = {},
): Promise<TherapistListItem[]> {
  const { data } = await apiClient.get('/api/admin/therapists', { params });
  return data;
}

export async function getTherapistDetail(
  therapistId: string,
): Promise<TherapistDetail> {
  const { data } = await apiClient.get(`/api/admin/therapists/${therapistId}`);
  return data;
}

export async function getTherapistSchedule(
  therapistId: string,
  params: ScheduleParams = {},
): Promise<ScheduleAppointment[]> {
  const { data } = await apiClient.get(
    `/api/admin/therapists/${therapistId}/schedule`,
    { params },
  );
  return data;
}

export async function getConsolidatedSchedule(
  params: ScheduleParams = {},
): Promise<ConsolidatedSchedule> {
  const { data } = await apiClient.get('/api/admin/therapists/schedule', {
    params,
  });
  return data;
}

export async function updateTherapistCredentials(
  therapistId: string,
  credentials: {
    licenceNumber?: string;
    licenceExpiry?: string;
    credentialStatus?: CredentialStatus;
  },
): Promise<any> {
  const { data } = await apiClient.patch(
    `/api/admin/therapists/${therapistId}/credentials`,
    credentials,
  );
  return data;
}

// --- Tracking Board Types ---

export type TrackingStatusType = 'SCHEDULED' | 'WAITING' | 'IN_SESSION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface TrackingAppointment {
  id: string;
  scheduledTime: string;
  endTime: string;
  status: TrackingStatusType;
  trackingStatus: TrackingStatusType | null;
  checkedInAt: string | null;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
  child: {
    id: string;
    firstName: string;
    nickname: string | null;
    age: number;
  } | null;
  parent: {
    id: string;
    name: string;
    phone: string | null;
  };
  therapist: {
    id: string;
    name: string;
    avatar: string | null;
  };
  sessionType: string | null;
  duration: number;
  notes: string | null;
  caseId: string | null;
}

// --- Tracking Board API ---

export async function getTrackingAppointments(date?: string): Promise<TrackingAppointment[]> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const { data } = await apiClient.get('/api/admin/tracking/today', { params });
  return data;
}

export async function updateTrackingStatus(
  bookingId: string,
  status: TrackingStatusType,
  notes?: string,
): Promise<TrackingAppointment> {
  const { data } = await apiClient.patch(`/api/admin/tracking/${bookingId}`, {
    status,
    notes,
  });
  return data;
}
