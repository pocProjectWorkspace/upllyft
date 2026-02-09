// apps/api/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserPreferencesController } from './user-preferences.controller'; // Add
import { UserPreferencesService } from './user-preferences.service';     // Add
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    UsersController,
    UserPreferencesController, // Add this
  ],
  providers: [
    UsersService,
    UserPreferencesService,    // Add this
  ],
  exports: [
    UsersService,
    UserPreferencesService,    // Export if needed elsewhere
  ],
})
export class UsersModule {}