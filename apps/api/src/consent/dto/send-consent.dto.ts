import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class SendConsentDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  intakeId: string;

  @IsString()
  @IsNotEmpty()
  patientName: string;

  @IsString()
  @IsNotEmpty()
  parentName: string;

  @IsEmail()
  @IsNotEmpty()
  parentEmail: string;
}
