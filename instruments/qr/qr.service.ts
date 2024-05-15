import { Injectable } from '@nestjs/common';
import * as qrcode from 'qrcode';

@Injectable()
export class QrService {
  // returns Base64 string of QR image
  async generateQrCode(data: string): Promise<string> {
    try {
      return await qrcode.toDataURL(data);
    } catch (err) {
      throw err;
    }
  }
}
