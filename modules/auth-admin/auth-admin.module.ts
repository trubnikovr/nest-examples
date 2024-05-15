import { BcryptModule } from '@infrastructure/bcrypt/bcrypt.module';
import { BcryptService } from '@infrastructure/bcrypt/bcrypt.service';
import { EnvironmentConfigModule } from '@infrastructure/environment-config/environment-config.module';
import { EnvironmentConfigService } from '@infrastructure/environment-config/environment-config.service';
import { AdminUsersModule } from '@modules/admin-users/admin-users.module';
import { AuthAdminMiddleware } from '@modules/auth-admin/middlewares/auth.middleware';
import { AdminUserService } from '@modules/auth-admin/services/admin-user.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminUsersModule as AdminUserModule } from '../admin-users/admin-users.module';
import { AuthAdminService } from './services/auth-admin.service';

@Module({
  imports: [
    AdminUsersModule,
    AdminUserModule,
    EnvironmentConfigModule,
    BcryptModule,
    JwtModule.registerAsync({
      inject: [EnvironmentConfigService],
      // eslint-disable-next-line @typescript-eslint/require-await
      useFactory: async () => ({
        secret: process.env.JWT_SECRET,
      }),
    }),
  ],
  providers: [AuthAdminService, BcryptService, AdminUserService, AuthAdminMiddleware],
  exports: [AuthAdminService],
})
export class AuthAdminModule {}
