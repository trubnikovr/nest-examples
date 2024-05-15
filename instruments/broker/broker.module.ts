import { EnvironmentConfigService } from '@infrastructure/environment-config/environment-config.service';
import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Global()
@Module({})
export class BrokerModule {
  static register(config: { name: string; brokers?: string[]; consumerGroupId?: string; clientId?: string }) {
    return {
      module: BrokerModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: config.name,
            useFactory: (configService: EnvironmentConfigService) => ({
              // Используйте настройки из configService
              transport: Transport.REDIS,
              options: {
                retryAttempts: 100,
                retryDelay: 5000,
              //  reconnectOnError: () => 1,
               // reconnectOnError: 1,
                host: configService.getRedisHost(),
                port: configService.getRedisPort(),
              },
            }),
            inject: [EnvironmentConfigService],
          },
        ]),
        // ClientsModule.register([
        //   {
        //
        //     name: config.name,
        //     transport: Transport.REDIS,
        //     options: {
        //       host: 'localhost',
        //       port: 6379,
        //     }
        //   }
        // ])
      ],
      exports: [ClientsModule],
    };
  }
}
