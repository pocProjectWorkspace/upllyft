import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentDto {
    @ApiProperty({
        description: 'Child ID for whom the assessment is being created',
        example: 'clxxx123456',
    })
    @IsString()
    @IsNotEmpty()
    childId: string;

    @ApiProperty({
        description: 'Age group for the assessment',
        example: '12-15months',
    })
    @IsString()
    @IsNotEmpty()
    ageGroup: string;
}
