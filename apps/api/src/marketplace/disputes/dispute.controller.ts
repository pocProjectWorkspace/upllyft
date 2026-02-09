import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import {
    RaiseDisputeDto,
    ResolveDisputeDto,
    DisputeResponseDto,
} from './dto/dispute.dto';
import { DisputeStatus } from '@prisma/client';

@Controller('marketplace/disputes')
export class DisputeController {
    constructor(private disputeService: DisputeService) { }

    /**
     * Raise a dispute for a booking
     */
    @Post(':bookingId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async raiseDispute(
        @Param('bookingId') bookingId: string,
        @Body() dto: RaiseDisputeDto,
        @Request() req: any,
    ): Promise<DisputeResponseDto> {
        return this.disputeService.raiseDispute(bookingId, req.user.userId, dto);
    }

    /**
     * Get all disputes (admin only)
     */
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async getAllDisputes(@Query('status') status?: DisputeStatus): Promise<DisputeResponseDto[]> {
        return this.disputeService.getAllDisputes(status);
    }

    /**
     * Get user's disputes
     */
    @Get('user/:userId')
    @UseGuards(JwtAuthGuard)
    async getUserDisputes(
        @Param('userId') userId: string,
        @Request() req: any,
    ): Promise<DisputeResponseDto[]> {
        // Verify user is requesting their own disputes
        if (userId !== req.user.userId) {
            throw new Error('Unauthorized');
        }
        return this.disputeService.getUserDisputes(userId);
    }

    /**
     * Resolve a dispute (admin only)
     */
    @Patch(':disputeId/resolve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async resolveDispute(
        @Param('disputeId') disputeId: string,
        @Body() dto: ResolveDisputeDto,
        @Request() req: any,
    ): Promise<DisputeResponseDto> {
        return this.disputeService.resolveDispute(disputeId, req.user.userId, dto);
    }
}
