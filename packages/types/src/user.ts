export enum UserRole {
  PARENT = 'PARENT',
  THERAPIST = 'THERAPIST',
  ADMIN = 'ADMIN',
  SPECIAL_EDUCATOR = 'SPECIAL_EDUCATOR',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
