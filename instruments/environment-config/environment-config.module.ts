import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EnvironmentConfigService } from './environment-config.service';
import { validate } from './environment-config.validation';

@Global()
@Module({
  providers: [EnvironmentConfigService],
  exports: [EnvironmentConfigService],
})
// @ToDo thing need this? need to add validation
// @toDo .env.api change to api.env
export class EnvironmentConfigModule {
  static register(path: string | string[]): any {
    return {
      module: EnvironmentConfigModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: path,
          ignoreEnvFile: false,
          isGlobal: true,
          validate,
        }),
      ],
    };
  }
}
