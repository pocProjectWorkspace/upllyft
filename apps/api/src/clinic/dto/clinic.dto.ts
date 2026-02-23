import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClinicTherapistDto {
    @IsString()
    name: string;

    @IsString()
    email: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    specializations?: string[];
}

export class AvailabilitySlotDto {
    @IsInt()
    @Min(0)
    @Max(6)
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    @IsString()
    startTime: string; // HH:mm

    @IsString()
    endTime: string; // HH:mm
}

export class UpdateTherapistScheduleDto {
    @IsOptional()
    @IsArray()
    @Type(() => AvailabilitySlotDto)
    availability?: AvailabilitySlotDto[];
}

export class UpdateClinicDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    licenseNo?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    bannerUrl?: string;

    @IsOptional()
    @IsString()
    primaryColor?: string;

    @IsOptional()
    @IsString()
    secondaryColor?: string;

    @IsOptional()
    @IsString()
    accentColor?: string;
}
