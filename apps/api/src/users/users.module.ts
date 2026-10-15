// apps/api/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserPreferencesController } from './user-preferences.controller'; // Add
import { UserPreferencesService } from './user-preferences.service';     // Add
import { PrismaModule } from '../prisma/prisma.module';
import { AccountPreferencesService } from './account-preferences.service';
import { AccountDeletionService } from './account-deletion.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    UsersController,
    UserPreferencesController, // Add this
  ],
  providers: [
    AccountDeletionService,
    AccountPreferencesService,
    UsersService,
    UserPreferencesService,    // Add this
  ],
  exports: [
    AccountDeletionService,
    UsersService,
    UserPreferencesService,    // Export if needed elsewhere
  ],
})
export class UsersModule {}