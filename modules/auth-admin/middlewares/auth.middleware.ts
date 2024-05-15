import { EnvironmentConfigService } from '@infrastructure/environment-config/environment-config.service';
import { AdminUserService as AdminUsersService } from '@modules/admin-users/services/admin-user.service';
import { AdminUserService } from '@modules/auth-admin/services/admin-user.service';
import type { NestMiddleware } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import { IAdminUser } from '@interfaces/admin-user/admin-user.interface';

@Injectable()
export class AuthAdminMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private adminUserService: AdminUserService,
    private configService: EnvironmentConfigService,
    private adminUsersService: AdminUsersService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const token = this.extractTokenFromHeader(req);

      if (!token) {
        throw new UnauthorizedException();
      }

      const admin = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      const doesAdminExist = await this.adminUsersService.findByEmail(admin?.email);

      if (!admin || !doesAdminExist) {
        throw new UnauthorizedException();
      }
      //TODO fix - create common
      req['user'] = admin;

      this.adminUserService.setUser(req['user']);
    } catch (error) {
      console.error(error);

      throw new UnauthorizedException();
    }

    next();
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}
