import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import {
  IncidentCategory,
  IncidentUrgency,
  IncidentStatus,
  ExternalRecipientType,
} from '@prisma/client';

// ── Incident / escalation ─────────────────────────────────────────────────
export class CreateIncidentDto {
  @IsEnum(IncidentCategory) category: IncidentCategory;
  @IsString() description: string;
  @IsOptional() @IsString() caseId?: string;
  @IsOptional() @IsString() childId?: string;
  @IsOptional() @IsString() raisedFromModule?: string;
  @IsOptional() @IsEnum(IncidentUrgency) urgency?: IncidentUrgency;
}

export class UpdateIncidentDto {
  @IsOptional() @IsEnum(IncidentStatus) status?: IncidentStatus;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() clinicalDecision?: string;
  @IsOptional() @IsString() actionPlan?: string;
}

export class CloseIncidentDto {
  @IsOptional() @IsString() actionPlan?: string;
}

// ── External (consent-gated) share ────────────────────────────────────────
export class CreateExternalShareDto {
  @IsString() caseId: string;
  @IsString() recipientName: string;
  @IsEnum(ExternalRecipientType) recipientType: ExternalRecipientType;
  @IsString() consentId: string;
  @IsOptional() @IsInt() @Min(1) expiresInDays?: number;
}

// ── Discharge / retention ─────────────────────────────────────────────────
export class DischargeCaseDto {
  @IsOptional() @IsString() clinicalReason?: string;
  @IsOptional() @IsString() adminReason?: string;
  @IsOptional() @IsString() dischargeSummaryDocId?: string;
  @IsOptional() @IsInt() @Min(1) retentionDays?: number;
}
