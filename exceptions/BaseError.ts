export interface IAdditionalData {
  message: string
}
export class BaseError extends Error {
  public errorCode: number;
  public additionalData: IAdditionalData;

  constructor(message: string, errorCode: number = 0, additionalData?: IAdditionalData) {
    super(message);
    this.additionalData = additionalData;
  }

  toString() {
    return this.message;
  }
}