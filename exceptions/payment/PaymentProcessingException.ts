import { IAdditionalData } from '../BaseError';
import { PaymentErrorCode, PaymentErrorMessages } from '../../constants/errors/PaymentErrors';
import { PublicError } from '../PublicError';

export class PaymentProcessingException extends PublicError {
  public errorCode: number;

  constructor(errorCode: PaymentErrorCode, additionalData?: IAdditionalData) {
    const message = PaymentErrorMessages[errorCode]
    super(message, errorCode, additionalData); // Передаем сообщение в базовый класс Error
    this.errorCode = errorCode; // Сохраняем код ошибки
  }
}