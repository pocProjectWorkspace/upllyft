import { IsString, IsDateString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';

export class CreateBookingDto {
    @IsString()
    therapistId: string;

    @IsString()
    sessionTypeId: string;

    @IsDateString()
    startDateTime: string;

    @IsString()
    timezone: string;

    @IsString()
    @IsOptional()
    patientNotes?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    patientFiles?: string[];
}

export class RejectBookingDto {
    @IsString()
    reason: string;
}

export class CancelBookingDto {
    @IsString()
    @IsOptional()
    reason?: string;
}

export class SetAvailabilityDto {
    @IsNumber()
    @Min(0)
    dayOfWeek: number; // 0-6

    @IsString()
    startTime: string; // "HH:mm"

    @IsString()
    endTime: string; // "HH:mm"

    @IsString()
    timezone: string;
}

export class AddAvailabilityExceptionDto {
    @IsDateString()
    date: string;

    @IsString()
    type: 'AVAILABLE' | 'BLOCKED';

    @IsString()
    @IsOptional()
    startTime?: string;

    @IsString()
    @IsOptional()
    endTime?: string;

    @IsString()
    @IsOptional()
    reason?: string;
}

export class GetAvailableSlotsDto {
    @IsDateString()
    date: string;

    @IsString()
    sessionTypeId: string;

    @IsString()
    timezone: string;
}
