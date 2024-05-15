import { ConverterAbstract } from "@infrastructure/files/abstracts/converter.abstract";
import { Injectable } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class LinkConverter extends ConverterAbstract {
  async convert(link: string ): Promise<Buffer> {
    const response = await axios.get(link, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    return buffer;
  }
}