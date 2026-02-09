import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
    @ApiPropertyOptional({ description: 'Organization name' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Organization description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Organization website URL', example: 'https://example.com' })
    @IsOptional()
    @IsString()
    website?: string;

    @ApiPropertyOptional({ description: 'Logo URL from storage' })
    @IsOptional()
    @IsString()
    logo?: string;

    @ApiPropertyOptional({ description: 'Banner URL from storage' })
    @IsOptional()
    @IsString()
    banner?: string;
}
