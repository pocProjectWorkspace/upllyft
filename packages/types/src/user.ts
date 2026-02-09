export enum UserRole {
  USER = 'USER',
  THERAPIST = 'THERAPIST',
  EDUCATOR = 'EDUCATOR',
  ORGANIZATION = 'ORGANIZATION',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  image?: string;
  bio?: string;
  phone?: string;
  location?: string;
  isEmailVerified: boolean;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}
