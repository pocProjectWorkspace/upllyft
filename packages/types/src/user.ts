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
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  children?: Child[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface PostAuthor {
  id: string;
  name: string;
  avatar?: string;
  role: UserRole;
  isVerified: boolean;
}

// Inline import to avoid circular — Child is defined in child.ts
// but UserProfile references it. We re-export from index.ts.
import type { Child } from './child';
