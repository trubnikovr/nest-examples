import * as moment from 'moment-timezone';
import { Injectable } from '@nestjs/common';

export class DateClass {
  getDate(date: Date | string): string
  {
    if(typeof date === 'string') {
      date = new Date(date)
    }
    return moment.utc(date).format();
  }

  getDateFromMoment(date: Date): Date {
    return moment.utc(date).format() as unknown as Date;
  }

  isValidDate(date: Date | string): boolean {
    const parsed = moment(date, 'YYYY-MM-DD', true);
    return parsed.isValid();
  }

  formatDate(date: Date, formatting): string {
    if(typeof date === 'string') {
      date = new Date(date)
    }

    return moment.tz(date, moment().tz()).format(formatting);
  }

  addHour(date: Date, number: number): Date {

    return moment.utc(date).add(number, 'hour').format() as unknown as Date;
  }

  changeTimeZone(date: Date, timezone: string = 'UTC'): Date {

    const originalMoment = moment(date).tz(timezone);
    const currentDate = new Date(originalMoment.clone().tz(moment().tz()).format())

    currentDate.toLocaleString("en-US", {timeZone: "America/New_York"});
    var dateFormat = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      timeZoneName: "short"
    });
    dateFormat.format(date);
    return currentDate;
  }
}