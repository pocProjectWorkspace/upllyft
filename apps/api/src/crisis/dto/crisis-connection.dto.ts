// apps/api/src/crisis/dto/crisis-connection.dto.ts

import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateConnectionDto {
  @IsString()
  incidentId: string;

  @IsString()
  @IsOptional()
  volunteerId?: string;

  @IsString()
  @IsOptional()
  resourceId?: string;

  @IsString()
  connectionType: string; // CALL, WHATSAPP, CHAT
}

export class UpdateConnectionDto {
  @IsString()
  @IsOptional()
  outcome?: string; // RESOLVED, ESCALATED, DISCONNECTED

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;
}
