import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IDatabaseConfig {
  getDatabaseHost(): string;
  getDatabasePort(): number;
  getDatabaseUser(): string;
  getDatabasePassword(): string;
  getDatabaseName(): string;
  // getDatabaseSchema(): string;
  // getDatabaseSync(): boolean;
}
export interface IJWTConfig {
  getJwtSecret(): string;
  getJwtExpirationTime(): string;
  getJwtRefreshSecret(): string;
  getJwtRefreshExpirationTime(): string;
}

export interface IJwtConfigAdmin {
  getJwtSecretAdmin(): string;
  getJwtExpirationAdmin(): string;
}

export interface IRedisConfig {
  getRedisHost(): string;
  getRedisPort(): number;
}

export interface IAppConfig {
  getAppFrontendPort(): number;
  getAppBackendPort(): number;
  getAppEnv(): string;
  getAppName(): string;
}

export interface IPlayMobileConfig {
  getPlayMobileUrl(): string;
  getPlayMobileUsername(): string;
  getPlayMobilePassword(): string;
  getSmsOriginator(): number;
}

export interface IUniredPaymentConfig {
  getUniredApiUrl(): string;
  getUniredUsername(): string;
  getUniredPassword(): string;
}

//@toDo overwrite
@Injectable()
export class EnvironmentConfigService
  implements
    IDatabaseConfig,
    IJWTConfig,
    IRedisConfig,
    IAppConfig,
    IPlayMobileConfig,
    IUniredPaymentConfig,
    IJwtConfigAdmin
{
  constructor(private configService: ConfigService) {}

  isDev(): boolean {
    return this.configService.get<string>('APP_ENV') !== 'production';
  }

  getAppEnv(): string {
    return this.configService.get<string>('APP_ENV');
  }

  getAppName(): string {
    return this.configService.get<string>('APP_NAME');
  }

  getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }

  getJwtExpirationTime(): string {
    return this.configService.get<string>('JWT_EXPIRATION_TIME');
  }

  getJwtRefreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
  }

  getJwtRefreshExpirationTime(): string {
    return this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME');
  }

  getDatabaseHost(): string {
    return this.configService.get<string>('DB_HOST');
  }

  getDatabasePort(): number {
    return this.configService.get<number>('DB_PORT');
  }

  getDatabaseUser(): string {
    return this.configService.get<string>('DB_USERNAME');
  }

  getDatabasePassword(): string {
    return this.configService.get<string>('DB_PASSWORD');
  }

  getDatabaseName(): string {
    return this.configService.get<string>('DB_DATABASE');
  }

  getAppBackendPort(): number {
    return this.configService.get<number>('APP_PORT_BACKEND');
  }

  getAppFrontendPort(): number {
    return this.configService.get<number>('APP_PORT_FRONTEND');
  }

  getRedisHost(): string {
    console.info('REDIS_HOST', this.configService.get<string>('REDIS_HOST'));

    return this.configService.get<string>('REDIS_HOST');
  }

  getRedisPort(): number {
    return this.configService.get<number>('REDIS_PORT');
  }

  getPaymeKey(): number {
    return this.configService.get<number>('PAYME_KEY');
  }

  getPaymeMerchantId(): string {
    return this.configService.get<string>('PAYMENT_MERCHANT_ID');
  }

  getPaymeCheckoutUrl(): number {
    return this.configService.get<number>('PAYME_CHECKOUT_URL');
  }

  getPlayMobileUrl(): string {
    return this.configService.get<string>('PLAYMOBILE_BASE_URL');
  }

  getPlayMobileUsername(): string {
    return this.configService.get<string>('PLAYMOBILE_USERNAME');
  }

  getPlayMobilePassword(): string {
    return this.configService.get<string>('PLAYMOBILE_PASSWORD');
  }

  getSmsOriginator(): number {
    return 3700;
  }

  getUniredApiUrl(): string {
    return this.configService.get<string>('UNIRED_API_URL');
  }

  getUniredPassword(): string {
    return this.configService.get<string>('UNIRED_API_PASS');
  }

  getUniredUsername(): string {
    return this.configService.get<string>('UNIRED_API_USER');
  }

  getJwtSecretAdmin(): string {
    return this.configService.get<string>('JWT_SECRET_ADMIN');
  }

  getJwtExpirationAdmin(): string {
    return this.configService.get<string>('JWT_EXPIRATION_ADMIN');
  }
}
