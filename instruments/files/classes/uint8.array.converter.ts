import { ConverterAbstract } from "@infrastructure/files/abstracts/converter.abstract";

export class Uint8ArrayConverter extends ConverterAbstract {
  async convert(data: Uint8Array): Promise<Buffer> {

    return Buffer.from(data);
  }
}