import { OrderRestaurantDetailOrder } from '@modules/orders/entities/types/order.restaurant.detail.order';
import { Global, Module } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { LoggerOptions } from 'typeorm/logger/LoggerOptions';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { EnvironmentConfigModule } from '../environment-config/environment-config.module';
import { EnvironmentConfigService } from '../environment-config/environment-config.service';

export const getTypeOrmModuleOptions = (
  config: EnvironmentConfigService,
  entities?: any[],
  synchronize = false,
  logging: LoggerOptions = ['error'],
): TypeOrmModuleOptions => ({
  //  name: 'secondary', // this
  type: 'postgres',
  host: config.getDatabaseHost(),
  port: config.getDatabasePort(),
  username: config.getDatabaseUser(),
  password: config.getDatabasePassword(),
  database: config.getDatabaseName(),
  namingStrategy: new SnakeNamingStrategy(),
  //@ToDo OrderRestaurantDetailOrder - check why not working
  entities: entities || [__dirname + './../../modules/**/**.entity{.ts,.js}', OrderRestaurantDetailOrder],
  //synchronize: config.isDev(),
  synchronize,
  logging,
  //logging: [ "error"],
  logger: 'advanced-console',
});

@Global()
@Module({})
export class TypeOrmConfigModule {
  static register(synchronize = false, entities?: any[], logging: LoggerOptions = ['error']): any {
    return {
      module: TypeOrmConfigModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [EnvironmentConfigModule],
          inject: [EnvironmentConfigService],
          useFactory: (config: EnvironmentConfigService) =>
            getTypeOrmModuleOptions(config, entities, synchronize, logging),
        }),
      ],
      exports: [TypeOrmModule],
    };
  }
}
