import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceType, RegisterFcmTokenDto, UpdateFcmTokenDto } from './dto';

@Injectable()
export class FcmTokenService {
    private readonly logger = new Logger(FcmTokenService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Register or update an FCM token for a user
     * If the token already exists, it updates the record
     * If it's a new token, it creates a new record
     */
    async registerToken(userId: string, email: string, dto: RegisterFcmTokenDto) {
        this.logger.log(`Registering FCM token attempt - User: ${userId}, Email: ${email}, Device: ${dto.device}`);

        if (!userId || !email) {
            this.logger.error(`Missing required fields for FCM registration: userId=${userId}, email=${email}`);
            throw new Error('User ID and Email are required for FCM registration');
        }

        try {
            // Check if this exact token already exists
            this.logger.debug(`Checking if token exists: ${dto.fcmToken.substring(0, 10)}...`);
            const existingToken = await this.prisma.fcmToken.findUnique({
                where: { fcmToken: dto.fcmToken },
            });

            if (existingToken) {
                this.logger.log(`Token exists. Updating association to User: ${userId}`);
                const updated = await this.prisma.fcmToken.update({
                    where: { fcmToken: dto.fcmToken },
                    data: {
                        userId,
                        email,
                        device: dto.device as any,
                        isActive: true,
                        lastUsed: new Date(),
                        updatedAt: new Date(),
                    },
                });

                this.logger.log(`✅ DATABASE SUCCESS: Updated FCM token ID ${updated.id} for user ${userId}`);
                return {
                    message: 'FCM token registered successfully',
                    data: updated,
                    isNew: false,
                };
            }

            // Create new token record
            this.logger.log(`Token is new. Inserting into database...`);
            const newToken = await this.prisma.fcmToken.create({
                data: {
                    userId,
                    email,
                    fcmToken: dto.fcmToken,
                    device: dto.device as any,
                    isActive: true,
                    lastUsed: new Date(),
                },
            });

            this.logger.log(`✅ DATABASE SUCCESS: Created new FCM token ID ${newToken.id} for user ${userId}`);
            return {
                message: 'FCM token registered successfully',
                data: newToken,
                isNew: true,
            };
        } catch (error) {
            this.logger.error(`❌ DATABASE ERROR: Failed to register FCM token: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get all FCM tokens for a user
     */
    async getTokensByUserId(userId: string) {
        const tokens = await this.prisma.fcmToken.findMany({
            where: {
                userId,
                isActive: true,
            },
            orderBy: { lastUsed: 'desc' },
        });

        return tokens;
    }

    /**
     * Get FCM tokens by email
     */
    async getTokensByEmail(email: string) {
        const tokens = await this.prisma.fcmToken.findMany({
            where: {
                email,
                isActive: true,
            },
            orderBy: { lastUsed: 'desc' },
        });

        return tokens;
    }

    /**
     * Get all FCM tokens for a user by device type
     */
    async getTokensByDevice(userId: string, device: DeviceType) {
        const tokens = await this.prisma.fcmToken.findMany({
            where: {
                userId,
                device: device as any,
                isActive: true,
            },
            orderBy: { lastUsed: 'desc' },
        });

        return tokens;
    }

    /**
     * Update an FCM token
     */
    async updateToken(tokenId: string, userId: string, dto: UpdateFcmTokenDto) {
        // Verify the token belongs to the user
        const existingToken = await this.prisma.fcmToken.findFirst({
            where: {
                id: tokenId,
                userId,
            },
        });

        if (!existingToken) {
            throw new NotFoundException('FCM token not found');
        }

        const updateData: any = {};

        if (dto.fcmToken) updateData.fcmToken = dto.fcmToken;
        if (dto.device) updateData.device = dto.device as any;
        if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
        updateData.lastUsed = new Date();

        const updated = await this.prisma.fcmToken.update({
            where: { id: tokenId },
            data: updateData,
        });

        this.logger.log(`Updated FCM token ${tokenId} for user: ${userId}`);
        return updated;
    }

    /**
     * Deactivate an FCM token (soft delete)
     */
    async deactivateToken(tokenId: string, userId: string) {
        const existingToken = await this.prisma.fcmToken.findFirst({
            where: {
                id: tokenId,
                userId,
            },
        });

        if (!existingToken) {
            throw new NotFoundException('FCM token not found');
        }

        await this.prisma.fcmToken.update({
            where: { id: tokenId },
            data: { isActive: false },
        });

        this.logger.log(`Deactivated FCM token ${tokenId} for user: ${userId}`);
        return { message: 'FCM token deactivated successfully' };
    }

    /**
     * Deactivate all FCM tokens for a user (e.g., on logout from all devices)
     */
    async deactivateAllTokens(userId: string) {
        const result = await this.prisma.fcmToken.updateMany({
            where: { userId },
            data: { isActive: false },
        });

        this.logger.log(`Deactivated ${result.count} FCM tokens for user: ${userId}`);
        return {
            message: 'All FCM tokens deactivated successfully',
            count: result.count,
        };
    }

    /**
     * Delete an FCM token permanently
     */
    async deleteToken(tokenId: string, userId: string) {
        const existingToken = await this.prisma.fcmToken.findFirst({
            where: {
                id: tokenId,
                userId,
            },
        });

        if (!existingToken) {
            throw new NotFoundException('FCM token not found');
        }

        await this.prisma.fcmToken.delete({
            where: { id: tokenId },
        });

        this.logger.log(`Deleted FCM token ${tokenId} for user: ${userId}`);
        return { message: 'FCM token deleted successfully' };
    }

    /**
     * Delete FCM token by the token string itself
     * Useful when logging out from a specific device
     */
    async deleteTokenByValue(fcmToken: string, userId: string) {
        const existingToken = await this.prisma.fcmToken.findFirst({
            where: {
                fcmToken,
                userId,
            },
        });

        if (!existingToken) {
            throw new NotFoundException('FCM token not found');
        }

        await this.prisma.fcmToken.delete({
            where: { id: existingToken.id },
        });

        this.logger.log(`Deleted FCM token by value for user: ${userId}`);
        return { message: 'FCM token deleted successfully' };
    }

    /**
     * Get token statistics for a user
     */
    async getTokenStats(userId: string) {
        const [total, active, byDevice] = await Promise.all([
            this.prisma.fcmToken.count({ where: { userId } }),
            this.prisma.fcmToken.count({ where: { userId, isActive: true } }),
            this.prisma.fcmToken.groupBy({
                by: ['device'],
                where: { userId, isActive: true },
                _count: { device: true },
            }),
        ]);

        return {
            totalTokens: total,
            activeTokens: active,
            byDevice: byDevice.reduce((acc, item) => {
                acc[item.device] = item._count.device;
                return acc;
            }, {}),
        };
    }

    /**
     * Cleanup old/inactive tokens
     */
    async cleanupOldTokens(daysInactive: number = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

        const result = await this.prisma.fcmToken.deleteMany({
            where: {
                OR: [
                    { isActive: false },
                    {
                        lastUsed: { lt: cutoffDate },
                    },
                ],
            },
        });

        this.logger.log(`Cleaned up ${result.count} old/inactive FCM tokens`);
        return {
            message: 'Cleanup completed',
            deletedCount: result.count,
        };
    }
}
