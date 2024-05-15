import { LoggerClass } from '@infrastructure/logger/class/logger.class';
import { Global, Module } from '@nestjs/common';
import { LoggerOptions } from 'typeorm/logger/LoggerOptions';

import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [
    LoggerService,
    // {
    //   provide: LoggerService,
    //   useFactory: () => {
    //     return new LoggerClass(context);
    //   }
    // }
  ],
  exports: [LoggerService],
})
export class LoggerModule {
  static register(context): any {
    return {
      module: LoggerModule,
      providers: [
        // LoggerService,
        {
          provide: LoggerService,
          useFactory: () => new LoggerClass(context),
        },
      ],
      exports: [LoggerService],
    };
  }
}
