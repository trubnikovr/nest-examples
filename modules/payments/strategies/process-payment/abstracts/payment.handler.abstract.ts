import type { IUniredPaymentRequest } from '@interfaces/payments/unired.interface';

export abstract class PaymentHandlerAbstract {
  abstract isEnable(): boolean;

  abstract createTransaction(orderId, userId: number, body): unknown;

  abstract processPaymentOrder(orderId, userId: number, params?: IUniredPaymentRequest | null): Promise<unknown>;

  abstract beforeProcessPaymentOrder(
    orderId: number,
    userId: number,
    params?: IUniredPaymentRequest | null,
  ): Promise<unknown>;
}
