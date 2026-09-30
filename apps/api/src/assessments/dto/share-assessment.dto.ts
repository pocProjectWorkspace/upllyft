import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AccessLevel {
    VIEW = 'VIEW',
    ANNOTATE = 'ANNOTATE',
}

export class ShareAssessmentDto {
    @ApiProperty({
        description: 'Therapist user ID to share the assessment with',
        example: 'clxxx789012',
    })
    @IsString()
    @IsNotEmpty()
    therapistId: string;

    @ApiProperty({
        description: 'Access level for the therapist',
        enum: AccessLevel,
        example: AccessLevel.ANNOTATE,
        required: false,
    })
    @IsEnum(AccessLevel)
    @IsOptional()
    accessLevel?: AccessLevel = AccessLevel.VIEW;

    @ApiProperty({
        description: 'Optional message to send with the share notification',
        example: 'Please review my child\'s assessment',
        required: false,
    })
    @IsString()
    @IsOptional()
    message?: string;

    @ApiProperty({
        description:
            'Also share the item-by-item answers. Off by default: the professional sees scores and the summary.',
        required: false,
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    includeResponses?: boolean;
}
