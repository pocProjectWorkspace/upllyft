export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  verificationStatus: string;
  image: string | null;
  bio: string | null;
  reputation: number;
  licenseNumber: string | null;
  specialization: string[];
  yearsOfExperience: number | null;
  organization: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  languages: string[];
  education: string | null;
  certifications: string[];
  questionCount: number;
  answerCount: number;
  acceptedAnswerCount: number;
  helpfulVoteCount: number;
  createdAt: string;
}

export interface UserStats {
  postCount: number;
  connectionCount: number;
  bookmarkCount: number;
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  specialization?: string[];
  organization?: string;
  phone?: string;
  location?: string;
  website?: string;
  languages?: string[];
  education?: string;
  certifications?: string[];
  yearsOfExperience?: number;
}
