import { BcryptService } from '@infrastructure/bcrypt/bcrypt.service';
import type { IAdminUserWithoutPassword } from '@interfaces/admin-user/admin-user.without.password';
import type { IAuthAdminUserResponse } from '@interfaces/responses/controllers/auth.response';
import { AdminUserService } from '@modules/admin-users/services/admin-user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthAdminService {
  constructor(
    private adminUsersService: AdminUserService,
    private jwtService: JwtService,
    private readonly bcryptService: BcryptService,
  ) {}

  async login(email: string, adminUserPassword: string): Promise<IAdminUserWithoutPassword> {
    const adminUser = await this.adminUsersService.findByEmail(email);

    if (!adminUser) {
      throw new UnauthorizedException('Admin User is not authorized');
    }

    const { password, ...adminUserWithOutPassword } = adminUser;
    const isMatch = await this.bcryptService.comparePasswords(adminUserPassword, password);

    if (!isMatch) {
      throw new UnauthorizedException('Incorrect password');
    }

    return adminUserWithOutPassword;
  }

  // @ToDo add response format
  async generateAccessToken(adminUserWithOutPassword: IAdminUserWithoutPassword): Promise<IAuthAdminUserResponse> {
    const payload = adminUserWithOutPassword;

    // 'string' is not assignable to '"string"'
    return {
      userAdmin: adminUserWithOutPassword,
      access_token: 'Bearer ' + this.jwtService.sign(payload),
    };
  }
}
