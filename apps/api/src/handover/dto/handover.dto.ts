import { IsString, IsOptional, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { HandoverRecipient } from '@prisma/client';

export class GenerateHandoverDto {
  @IsEnum(HandoverRecipient)
  recipientType!: HandoverRecipient;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  recipientName?: string;
}

export class UpdateHandoverDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  summary?: string;

  @IsOptional()
  @IsEnum(HandoverRecipient)
  recipientType?: HandoverRecipient;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  recipientName?: string;
}
