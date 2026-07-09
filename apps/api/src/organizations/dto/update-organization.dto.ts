import { IsOptional, IsString, IsUrl, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** `#RGB` or `#RRGGBB`; empty string clears the colour back to the theme default. */
const HEX_COLOR = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))?$/;

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

    @ApiPropertyOptional({ description: 'Brand primary colour', example: '#0d9488' })
    @IsOptional()
    @IsString()
    @Matches(HEX_COLOR, { message: 'primaryColor must be a hex colour like #0d9488' })
    primaryColor?: string;

    @ApiPropertyOptional({ description: 'Brand secondary colour', example: '#134e4a' })
    @IsOptional()
    @IsString()
    @Matches(HEX_COLOR, { message: 'secondaryColor must be a hex colour like #134e4a' })
    secondaryColor?: string;

    @ApiPropertyOptional({ description: 'Brand accent colour', example: '#f59e0b' })
    @IsOptional()
    @IsString()
    @Matches(HEX_COLOR, { message: 'accentColor must be a hex colour like #f59e0b' })
    accentColor?: string;
}
