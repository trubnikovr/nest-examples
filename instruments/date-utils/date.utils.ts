import { DateClass } from '@infrastructure/date-utils/date.class';
import { Injectable } from '@nestjs/common';
// eslint-disable-next-line import/no-namespace
import * as moment from 'moment-timezone';

@Injectable()
export class DateUtils {
  dateClassInstance: DateClass = new DateClass();

  getCurrentDate(fromDate: Date, formatting?: string): string {
    if (fromDate) {
      return moment
        .utc(this.formatDate(fromDate), 'YYYY-MM-DD HH:mm:ss')
        .tz('Asia/Tashkent')
        .format(formatting || '');
    }

    return moment(undefined, 'Asia/Tashkent').format(formatting || '');
  }

  getCurrentDateFromUtc(fromDate: Date, formatting?: string) {
    return moment.utc(this.formatDate(fromDate), 'YYYY-MM-DD HH:mm:ss').tz('Asia/Tashkent').format(formatting);
  }

  isValidDate(date: Date | string): boolean {
    const parsed = moment(date, 'YYYY-MM-DD', true);

    return parsed.isValid();
  }

  // TODO wrong
  addHour(date: Date, number: number): string {
    return moment.utc(this.formatDate(date), 'YYYY-MM-DD HH:mm:ss').tz('Asia/Tashkent').add(number, 'hour').format();
  }

  minusHour(date: Date, number: number): string {
    return moment
      .utc(this.formatDate(date), 'YYYY-MM-DD HH:mm:ss')
      .tz('Asia/Tashkent')
      .subtract(number, 'hour')
      .format();
  }

  addYear(date: Date, number: number): string {
    return moment.utc(this.formatDate(date), 'YYYY-MM-DD HH:mm:ss').tz('Asia/Tashkent').add(number, 'year').format();
  }

  toFormatDate(dateTime: Date, formatting: string) {
    return moment(this.formatDate(dateTime)).format(formatting);
  }

  formatDate(inputDate: Date): string {
    const year = inputDate.getFullYear();
    const month = String(inputDate.getMonth() + 1).padStart(2, '0'); // Месяц начинается с 0, добавляем 1 и форматируем
    const day = String(inputDate.getDate()).padStart(2, '0');
    const hours = String(inputDate.getHours()).padStart(2, '0');
    const minutes = String(inputDate.getMinutes()).padStart(2, '0');
    const seconds = String(inputDate.getSeconds()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    return formattedDate;
  }

  //todo check if invalid date
  getUtcTime(inputDate: Date, timezone: string) {
    return moment.tz(this.formatDate(inputDate), timezone).utc().format('YYYY-MM-DD HH:mm:ss') as unknown as Date;
  }

  toTimestamp(inputDate: Date): number {
    // Создайте объект Moment из текущей даты и времени в UTC
    const dateUtc = moment.utc(inputDate);

    // Преобразуйте его в объект Moment в текущей локальной временной зоне
    const dateLocal = dateUtc.local();

    // Получите временную метку (timestamp) для локальной даты
    const timestamp = dateLocal.valueOf();

    return timestamp;
  }

  getTimestamp(timestamp: number) {
    const timestampCountDigits = timestamp.toString().length;

    if (timestampCountDigits === 0) {
      return 0;
    }

    if (timestampCountDigits === 10) {
      return timestamp * 1000;
    }

    return timestamp;
  }
}
