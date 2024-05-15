import { Module } from '@nestjs/common';

import { AuthAdminGuard } from './guards/auth.admin.guard';

@Module({
  providers: [AuthAdminGuard],
  exports: [AuthAdminGuard],
})
export class AuthAdminGuardModule {}
