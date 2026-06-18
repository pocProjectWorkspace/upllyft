import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';
import {
  LeadChannel,
  LeadStatus,
  PayerType,
  TriageStatus,
  TriageDecision,
  RiskLevel,
  TelehealthPlatform,
  MdtReviewStatus,
  ReviewTriggerType,
  ClinicalFlagType,
  EhrExportFormat,
} from '@prisma/client';

// ── Leads ─────────────────────────────────────────────────────────────────
export class CreateLeadDto {
  @IsString() clinicId: string;
  @IsOptional() @IsEnum(LeadChannel) channel?: LeadChannel;
  @IsOptional() @IsString() concern?: string;
  @IsOptional() @IsString() childAge?: string;
  @IsOptional() @IsString() preferredBranch?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsEnum(PayerType) payerIndication?: PayerType;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() referralSource?: string;
  @IsOptional() @IsString() referrerName?: string;
  @IsOptional() @IsString() referrerOrg?: string;
  @IsOptional() @IsString() referrerContact?: string;
}

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus) status: LeadStatus;
  @IsOptional() @IsString() closeReason?: string;
  @IsOptional() @IsString() assignedToId?: string;
}

export class ConvertLeadDto {
  @IsString() childId: string;
}

// ── Triage / pathway ──────────────────────────────────────────────────────
export class CreatePathwayTemplateDto {
  @IsString() name: string;
  @IsOptional() @IsString() clinicId?: string;
  @IsOptional() @IsArray() serviceCodes?: string[];
  generates: any; // JSON spec of forms/tasks/appointments to spawn
}

export class CreateTriageReviewDto {
  @IsOptional() @IsString() caseId?: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsString() aiSummary?: string;
  @IsOptional() @IsEnum(RiskLevel) riskLevel?: RiskLevel;
  @IsOptional() @IsString() notes?: string;
}

export class DecideTriageDto {
  @IsEnum(TriageDecision) decision: TriageDecision;
  @IsOptional() @IsEnum(RiskLevel) riskLevel?: RiskLevel;
  @IsOptional() @IsString() pathwayTemplateId?: string;
  @IsOptional() @IsString() notes?: string;
}

// ── MDT ───────────────────────────────────────────────────────────────────
export class CreateMdtReviewDto {
  @IsString() caseId: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsArray() attendeeUserIds?: string[];
}

export class CompleteMdtReviewDto {
  @IsString() summary: string;
}

// ── Report approval (CaseDocument) ────────────────────────────────────────
export class RejectReportDto {
  @IsString() reason: string;
}

export class CreateParentReportDto {
  @IsString() title: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() fileUrl?: string;
}

// ── Telehealth metadata ───────────────────────────────────────────────────
export class RecordTelehealthDto {
  @IsOptional() @IsEnum(TelehealthPlatform) platform?: TelehealthPlatform;
  @IsOptional() @IsString() clinicianLicence?: string;
  @IsOptional() @IsString() clinicianLocation?: string;
  @IsOptional() @IsString() patientLocation?: string;
  @IsOptional() @IsString() telehealthConsentId?: string;
}

// ── Care review / clinical flag / addendum ────────────────────────────────
export class CreateCaseReviewDto {
  @IsString() caseId: string;
  @IsOptional() @IsString() treatmentPlanId?: string;
  @IsEnum(ReviewTriggerType) triggerType: ReviewTriggerType;
  @IsOptional() @IsDateString() dueAt?: string;
}

export class CompleteCaseReviewDto {
  @IsString() outcome: string;
}

export class ActivateTreatmentPlanDto {
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsInt() @Min(0) sessionsPlanned?: number;
  @IsOptional() @IsInt() @Min(0) reviewIntervalDays?: number;
}

export class FlagSessionDto {
  @IsEnum(ClinicalFlagType) flagType: ClinicalFlagType;
  @IsOptional() @IsString() reason?: string;
}

export class AddSessionAddendumDto {
  @IsString() content: string;
}

// ── EHR export ────────────────────────────────────────────────────────────
export class CreateEhrExportDto {
  @IsString() clinicId: string;
  @IsString() resourceType: string;
  @IsString() resourceId: string;
  @IsOptional() @IsEnum(EhrExportFormat) format?: EhrExportFormat;
}

export class ReconcileEhrExportDto {
  @IsString() ehrRef: string;
}
