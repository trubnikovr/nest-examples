import { OrderErrorCode, OrderErrorMessages } from '../../constants/errors/OrderErrors';
import { PublicError } from '../PublicError';

export class OrderCreationException extends PublicError {
  public errorCode: number;

  constructor(errorCode: OrderErrorCode, additionalData?: any) {
    const message = OrderErrorMessages[errorCode]
    super(message, errorCode); // Передаем сообщение в базовый класс Error
    this.errorCode = errorCode; // Сохраняем код ошибки
    // Object.setPrototypeOf(this, new.target.prototype); // восстанавливаем прототип
  }
}