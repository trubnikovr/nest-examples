import type { ILogger } from '@interfaces/logger/logger.interface';
import { ConsoleLogger, Injectable, Logger, Scope } from '@nestjs/common';

export class LoggerClass extends ConsoleLogger implements ILogger {
  context = '';

  constructor(context) {
    super();
    this.context = context;
  }

  debug(context: string, message: string) {
    if (process.env.NODE_ENV !== 'production') {
      super.debug(`[DEBUG] ${context} ${message}`, this.context);
    }
  }

  log(context: string, message: string, ...ddd) {
    super.log(`[INFO] ${context} ${message}`, this.context);
  }

  error(context: string, message: string, trace?: string) {
    super.error(`[ERROR] ${context} ${message}`, trace, this.context);
  }

  warn(context: string, message: string) {
    super.warn(`[WARN] ${context} ${message}`, this.context);
  }

  verbose(context: string, message: string) {
    if (process.env.NODE_ENV !== 'production') {
      super.verbose(`[VERBOSE] ${context}  ${message}`, this.context);
    }
  }
}
