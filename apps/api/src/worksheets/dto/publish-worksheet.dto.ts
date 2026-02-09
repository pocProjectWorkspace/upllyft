import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PublishWorksheetDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  contributorNotes?: string;
}
