// apps/api/src/crisis/prisma-imports.ts

// This file helps manage Prisma imports when there are issues
// It provides a single place to manage the imports

let PrismaClient: any;
let Prisma: any;

try {
  // Try to import from @prisma/client
  const prismaImport = require('@prisma/client');
  PrismaClient = prismaImport.PrismaClient;
  Prisma = prismaImport.Prisma;
} catch (error) {
  // If import fails, use any types
  console.warn('Prisma client not found, using fallback types');
  PrismaClient = class {};
  Prisma = {
    CrisisResourceWhereInput: {},
    CrisisVolunteerWhereInput: {},
    CrisisIncidentWhereInput: {},
  };
}

export { PrismaClient, Prisma };

// Export enum values that match your schema
export const CrisisTypeEnum = {
  SUICIDE_RISK: 'SUICIDE_RISK',
  SELF_HARM: 'SELF_HARM',
  MELTDOWN: 'MELTDOWN',
  PANIC_ATTACK: 'PANIC_ATTACK',
  MEDICAL_EMERGENCY: 'MEDICAL_EMERGENCY',
  FAMILY_CONFLICT: 'FAMILY_CONFLICT',
  BURNOUT: 'BURNOUT',
};

export const UrgencyLevelEnum = {
  IMMEDIATE: 'IMMEDIATE',
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  LOW: 'LOW',
};

export const CrisisStatusEnum = {
  ACTIVE: 'ACTIVE',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  FOLLOWUP_PENDING: 'FOLLOWUP_PENDING',
};