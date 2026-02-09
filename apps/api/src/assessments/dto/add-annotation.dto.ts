import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddAnnotationDto {
    @ApiProperty({
        description: 'Annotation notes from the therapist',
        example: 'Child shows good progress in gross motor skills',
    })
    @IsString()
    notes: string;

    @ApiProperty({
        description: 'Optional domain to attach the annotation to',
        example: 'grossMotor',
        required: false,
    })
    @IsString()
    @IsOptional()
    domain?: string;

    @ApiProperty({
        description: 'Optional question ID to attach the annotation to',
        example: 'T1_GM_001',
        required: false,
    })
    @IsString()
    @IsOptional()
    questionId?: string;

    @ApiProperty({
        description: 'Section ID to pin the annotation to (e.g. "executiveSummary", "narrative.biologicalFoundation")',
        example: 'executiveSummary',
        required: false,
    })
    @IsString()
    @IsOptional()
    sectionId?: string;

    @ApiProperty({
        description: 'Additional metadata for the annotation',
        required: false,
    })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
