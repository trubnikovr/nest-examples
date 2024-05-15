import { IAdditionalData } from '../BaseError';
import { PaymentErrorCode, PaymentErrorMessages } from '../../constants/errors/PaymentErrors';
import { PublicError } from '../PublicError';
import { RegistrationErrors } from '../../constants/errors/RegistrationErrors';

export class RegistrationException extends PublicError {
  public errorCode: number;

  constructor(errorCode: RegistrationErrors, additionalData?: IAdditionalData) {
    const message = PaymentErrorMessages[errorCode]
    super(message, errorCode, additionalData); // Передаем сообщение в базовый класс Error
    this.errorCode = errorCode; // Сохраняем код ошибки
  }
}
