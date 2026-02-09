// src/events/dto/update-event.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { EventStatus } from '@prisma/client';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsBoolean()
  isCancelled?: boolean;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}