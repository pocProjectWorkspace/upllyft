import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FcmTokenService } from './fcm-token.service';
import {
    RegisterFcmTokenDto,
    UpdateFcmTokenDto,
    FcmTokenResponseDto,
    DeviceType,
} from './dto';

@ApiTags('FCM Tokens')
@Controller('fcm-tokens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FcmTokenController {
    constructor(private readonly fcmTokenService: FcmTokenService) { }

    @Post('register')
    @ApiOperation({
        summary: 'Register FCM token',
        description:
            'Register or update an FCM token for the authenticated user. Called during login/registration.',
    })
    @ApiResponse({
        status: 201,
        description: 'FCM token registered successfully',
        type: FcmTokenResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async registerToken(
        @Request() req: any,
        @Body() dto: RegisterFcmTokenDto,
    ) {
        const userId = req.user.id || req.user.sub;
        const email = req.user.email;
        return this.fcmTokenService.registerToken(userId, email, dto);
    }

    @Get()
    @ApiOperation({
        summary: 'Get all FCM tokens',
        description: 'Get all active FCM tokens for the authenticated user',
    })
    @ApiResponse({
        status: 200,
        description: 'List of FCM tokens',
        type: [FcmTokenResponseDto],
    })
    async getMyTokens(@Request() req: any) {
        const userId = req.user.id || req.user.sub;
        return this.fcmTokenService.getTokensByUserId(userId);
    }

    @Get('by-device/:device')
    @ApiOperation({
        summary: 'Get FCM tokens by device type',
        description: 'Get active FCM tokens for a specific device type',
    })
    @ApiParam({
        name: 'device',
        enumName: 'DeviceType',
        description: 'Device type to filter by',
    })
    @ApiResponse({
        status: 200,
        description: 'List of FCM tokens for the specified device',
        type: [FcmTokenResponseDto],
    })
    async getTokensByDevice(
        @Request() req: any,
        @Param('device') device: DeviceType,
    ) {
        const userId = req.user.id || req.user.sub;
        return this.fcmTokenService.getTokensByDevice(userId, device);
    }

    @Get('stats')
    @ApiOperation({
        summary: 'Get FCM token statistics',
        description: 'Get statistics about FCM tokens for the authenticated user',
    })
    @ApiResponse({
        status: 200,
        description: 'Token statistics',
    })
    async getTokenStats(@Request() req: any) {
        const userId = req.user.id || req.user.sub;
        return this.fcmTokenService.getTokenStats(userId);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update FCM token',
        description: 'Update an existing FCM token',
    })
    @ApiParam({ name: 'id', description: 'FCM token ID' })
    @ApiResponse({
        status: 200,
        description: 'FCM token updated successfully',
        type: FcmTokenResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Token not found' })
    async updateToken(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateFcmTokenDto,
    ) {
        const userId = req.user.id || req.user.sub;
        return this.fcmTokenService.updateToken(id, userId, dto);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete FCM token',
        description: 'Permanently delete an FCM token',
    })
    @ApiParam({ name: 'id', description: 'FCM token ID' })
    @ApiResponse({ status: 200, description: 'Token deleted successfully' })
    @ApiResponse({ status: 404, description: 'Token not found' })
    async deleteToken(@Request() req: any, @Param('id') id: string) {
        const userId = req.user.id || req.user.sub;
        return this.fcmTokenService.deleteToken(id, userId);
    }

    @Post(':id/deactivate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Deactivate FCM token',
        description: 'Soft delete - deactivate an FCM token',
    })
    @ApiParam({ name: 'id', description: 'FCM token ID' })
    @ApiResponse({ status: 200, description: 'Token deactivated successfully' })
    @ApiResponse({ status: 404, description: 'Token not found' })
    async deactivateToken(@Request() req: any, @Param('id') id: string) {
        const userId = req.user.id || req.user.sub;
        return this.fcmTokenService.deactivateToken(id, userId);
    }

    @Post('deactivate-all')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Deactivate all FCM tokens',
        description: 'Deactivate all FCM tokens for the authenticated user (logout from all devices)',
    })
    @ApiResponse({
        status: 200,
        description: 'All tokens deactivated successfully',
    })
    async deactivateAllTokens(@Request() req: any) {
        const userId = req.user.id || req.user.sub;
        return this.fcmTokenService.deactivateAllTokens(userId);
    }

    @Delete('by-token')
    @ApiOperation({
        summary: 'Delete FCM token by value',
        description: 'Delete an FCM token using the token string itself',
    })
    @ApiQuery({
        name: 'token',
        description: 'The FCM token string to delete',
        required: true,
    })
    @ApiResponse({ status: 200, description: 'Token deleted successfully' })
    @ApiResponse({ status: 404, description: 'Token not found' })
    async deleteTokenByValue(
        @Request() req: any,
        @Query('token') token: string,
    ) {
        const userId = req.user.id || req.user.sub;
        return this.fcmTokenService.deleteTokenByValue(token, userId);
    }
}
