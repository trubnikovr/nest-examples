import { LoggerClass } from '@infrastructure/logger/class/logger.class';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService extends LoggerClass {
  //TODO add path to logs
  // constructor(@Inject(REQUEST) request: Request) {
  //   super();
  //   this.request = request;
  // }
}
