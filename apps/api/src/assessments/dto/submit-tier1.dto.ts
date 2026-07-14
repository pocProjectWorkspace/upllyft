import { IsArray, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AnswerType } from '@prisma/client';

/**
 * Re-exported from Prisma rather than redeclared.
 *
 * This was a hand-maintained duplicate of the `AnswerType` enum in schema.prisma, and
 * a duplicate that can drift is worse than none: the validator would reject a value
 * the column accepts (or the reverse), and the failure surfaces as a mystifying 400
 * rather than a type error. Adding NOT_OBSERVED to one and not the other would have
 * done exactly that. There is now one definition, in the schema, and it cannot drift.
 */
export { AnswerType };

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
