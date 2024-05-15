import { OrderRestaurantDetailOrder } from '@modules/orders/entities/types/order.restaurant.detail.order';
import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const rootPath = join(__dirname, '..', '..', 'env-files', 'api', '.admin.api.env');

dotenvConfig({ path: rootPath });
const config = {
  type: 'postgres',
  host: `${process.env.DB_HOST}`,
  port: `${process.env.DB_PORT}`,
  username: `${process.env.DB_USERNAME}`,
  password: `${process.env.DB_PASSWORD}`,
  database: `${process.env.DB_DATABASE}`,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [__dirname + './../../modules/**/**.entity{.ts,.js}', OrderRestaurantDetailOrder],
  migrations: [__dirname + './../../migrations/*'],
  autoLoadEntities: true,
  synchronize: false,
};

export default registerAs('typeorm', () => config);
export const connectionSource = new DataSource(config as DataSourceOptions);
