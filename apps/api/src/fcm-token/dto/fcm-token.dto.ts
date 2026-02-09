import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DeviceType {
    WEB = 'WEB',
    IOS = 'IOS',
    ANDROID = 'ANDROID',
    BROWSER = 'BROWSER',
}

export class RegisterFcmTokenDto {
    @ApiProperty({
        description: 'Firebase Cloud Messaging token from the client SDK',
        example: 'dAPZpk2bRl2XXXXXXXXXXXXXX:APA91bGXXXXXXXXXX...',
    })
    @IsString()
    fcmToken: string;

    @ApiProperty({
        description: 'Device type - web, ios, android, or browser',
        enum: () => DeviceType,
        enumName: 'DeviceType',
        example: DeviceType.WEB,
    })
    @IsEnum(DeviceType)
    device: DeviceType;

    @ApiPropertyOptional({
        description: 'Device name or identifier for reference',
        example: 'Chrome on Windows',
    })
    @IsString()
    @IsOptional()
    deviceName?: string;
}

export class UpdateFcmTokenDto {
    @ApiPropertyOptional({
        description: 'New FCM token to replace the old one',
        example: 'dAPZpk2bRl2YYYYYYYYYYYYYYYY:APA91bGYYYYYYYYYY...',
    })
    @IsString()
    @IsOptional()
    fcmToken?: string;

    @ApiPropertyOptional({
        description: 'Device type',
        enum: () => DeviceType,
        enumName: 'DeviceType',
    })
    @IsEnum(DeviceType)
    @IsOptional()
    device?: DeviceType;

    @ApiPropertyOptional({
        description: 'Whether the token is active',
        example: true,
    })
    @IsOptional()
    isActive?: boolean;
}

export class FcmTokenResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    fcmToken: string;

    @ApiProperty({ enum: () => DeviceType, enumName: 'DeviceType' })
    device: DeviceType;

    @ApiProperty()
    isActive: boolean;

    @ApiPropertyOptional()
    lastUsed?: Date;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
