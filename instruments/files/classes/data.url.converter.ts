import { Injectable } from '@nestjs/common';
import { ConverterAbstract } from '../abstracts/converter.abstract';

@Injectable()
export class DataUrlConverter extends ConverterAbstract {
  async convert(base64String: string): Promise<Buffer> {
    const splitedBase64String = base64String.split(',');

    return Buffer.from(splitedBase64String[1] || splitedBase64String[0] , 'base64');
  }
}
