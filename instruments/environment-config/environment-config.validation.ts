import { plainToClass } from 'class-transformer';
import { IsNumber, IsString, validateSync } from 'class-validator';

// enum Environment {
//   Development = 'development',
//   Production = 'production',
//   Local = 'local',
//   Test = 'test',
// }

class EnvironmentVariables {
  // @IsEnum(Environment)
  // APP_ENV: Environment;
  //
  // @IsString()
  // JWT_SECRET: string;
  //
  // @IsString()
  // JWT_EXPIRATION_TIME: string;
  //
  // @IsString()
  // JWT_REFRESH_TOKEN_SECRET: string;
  //
  // @IsString()
  // JWT_REFRESH_TOKEN_EXPIRATION_TIME: string;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string;
  // @IsString()
  // DATABASE_SCHEMA: string;
  // @IsBoolean()
  // DATABASE_SYNCHRONIZE: boolean;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
