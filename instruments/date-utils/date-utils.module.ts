import { Module } from '@nestjs/common';
import { DateUtils } from './date.utils';

@Module({
  providers: [DateUtils],
  exports: [DateUtils], // Если вы хотите экспортировать сервис для использования в других модулях
})
export class DateUtilsModule {}