// src/events/dto/event-interest.dto.ts
import { IsEnum } from 'class-validator';
import { InterestStatus } from '@prisma/client';

export class MarkInterestDto {
  @IsEnum(InterestStatus)
  status: InterestStatus;
}