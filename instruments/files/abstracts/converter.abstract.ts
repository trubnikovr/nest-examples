
export abstract class ConverterAbstract {


  abstract convert(data: string|Blob|Uint8Array): Promise<Buffer>
}