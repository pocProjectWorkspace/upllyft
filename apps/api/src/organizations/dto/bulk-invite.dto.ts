import { IsArray, IsEmail, IsEnum, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum OrganizationRole {
    ADMIN = 'ADMIN',
    MEMBER = 'MEMBER',
    MODERATOR = 'MODERATOR',
}

export class BulkInviteItemDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ enum: OrganizationRole, example: OrganizationRole.MEMBER })
    @IsEnum(OrganizationRole)
    @IsNotEmpty()
    role: OrganizationRole;
}

export class BulkInviteDto {
    @ApiProperty({ type: [BulkInviteItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkInviteItemDto)
    invites: BulkInviteItemDto[];
}
