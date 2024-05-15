import { METADATA_PERMISSION_PARAM_KEY, UNAUTHORIZED_REQUEST } from '@infrastructure/auth-admin-guard/constants';
import type { IAdminUser } from '@interfaces/admin-user/admin-user.interface';
import { Roles } from '@interfaces/admin-user/roles.enum';
import type IMetadataParams from '@interfaces/guard/metadata.params';
import { ILogger } from '@interfaces/logger/logger.interface';
import { AdminUserService } from '@modules/auth-admin/services/admin-user.service';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALL_ROLES, PERMISSIONS } from '@permissions/backend';
import type { Observable } from 'rxjs';

@Injectable()
export class AuthAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: ILogger,
    private adminUserService: AdminUserService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      const allowUnauthorized = this.reflector.get<boolean>(UNAUTHORIZED_REQUEST, context.getHandler());

      if (allowUnauthorized) {
        return true;
      }

      const permission = this.reflector.get<IMetadataParams>(METADATA_PERMISSION_PARAM_KEY, context.getHandler());

      if (!permission) {
        throw new Error('permission is empty. Add a @HasAccess decorator to your controller');
      }

      const { action = null, subject = null }: IMetadataParams = permission;

      if (!action || !subject) {
        throw new Error('action or subject is empty. Add a @Can decorator to your controller');
      }

      const allowRoles = PERMISSIONS[subject];

      if (!allowRoles) {
        throw new Error(`cannot find subject ${subject}, check your const PERMISSIONS`);
      }

      // try retrieve a rules ot throw error
      const rules: Roles[] & typeof ALL_ROLES = PERMISSIONS[subject][action];

      if (rules.includes(ALL_ROLES)) {
        return true;
      }

      const user: IAdminUser = this.adminUserService.getCurrentUser();

      if (!user) {
        throw new Error('User is required. User should be logged');
      }

      if (user.role === Roles.SuperAdmin) {
        return true;
      }

      if (rules.includes(user.role)) {
        return true;
      }

      throw new Error(`A Rule for subject ${subject} not found. check const PERMISSIONS`);
    } catch (error) {
      this.logger.error(
        request ? request?.route?.path : '',
        'can not find access, check permissions. Error: ' + error.toString(),
      );

      return false;
    }
  }
}
