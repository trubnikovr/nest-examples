import type { IAdminUser } from '@interfaces/admin-user/admin-user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminUserService {
  private currentUser: IAdminUser; // создание свойства currentUser

  private static instance: AdminUserService;

  constructor() {
    if (!AdminUserService.instance) {
      AdminUserService.instance = this;
    }
  }

  setUser(user: IAdminUser) {
    AdminUserService.getInstance().currentUser = user;

    return true;
  }

  getCurrentUser(): IAdminUser {
    return AdminUserService.getInstance().currentUser || undefined; // возвращает сохраненного пользователя
  }

  isLogged(): boolean {
    return Boolean(AdminUserService.getInstance().currentUser);
  }

  static getInstance(): AdminUserService {
    return AdminUserService?.instance;
  }
}
