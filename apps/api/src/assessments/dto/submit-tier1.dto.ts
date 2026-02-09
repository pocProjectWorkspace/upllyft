import { IsArray, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum AnswerType {
    YES = 'YES',
    SOMETIMES = 'SOMETIMES',
    NOT_SURE = 'NOT_SURE',
    NO = 'NO',
}

export class QuestionResponseDto {
    @ApiProperty({
        description: 'Question ID from the questionnaire',
        example: 'T1_GM_001',
    })
    @IsString()
    @IsNotEmpty()
    questionId: string;

    @ApiProperty({
        description: 'Answer selected by the parent',
        enum: AnswerType,
        example: AnswerType.YES,
    })
    @IsEnum(AnswerType)
    @IsNotEmpty()
    answer: AnswerType;
}

export class SubmitTier1ResponsesDto {
    @ApiProperty({
        description: 'Array of responses for Tier 1 questions',
        type: [QuestionResponseDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuestionResponseDto)
    responses: QuestionResponseDto[];
}
