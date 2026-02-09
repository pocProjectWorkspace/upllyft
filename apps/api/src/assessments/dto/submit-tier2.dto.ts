import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { QuestionResponseDto } from './submit-tier1.dto';

export class SubmitTier2ResponsesDto {
    @ApiProperty({
        description: 'Array of responses for Tier 2 questions',
        type: [QuestionResponseDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuestionResponseDto)
    responses: QuestionResponseDto[];
}
