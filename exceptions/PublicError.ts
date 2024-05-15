import { BaseError } from './BaseError';

export interface IAdditionalData {
  message: string
}
export class PublicError extends BaseError {
  public errorCode: number;
  public additionalData: IAdditionalData;

  constructor(message: string, errorCode: number, additionalData?: IAdditionalData) {
    super(message, errorCode, additionalData);
    this.additionalData = additionalData;
  }

  toString() {
    return this.message;
  }
}