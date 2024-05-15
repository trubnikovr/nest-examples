import type { ITransaction } from '@interfaces/payments/transacion.interface';
import type { PaymeProvider } from '@modules/payments/providers/payments/payme.provider';

import { PaymentHandlerAbstract } from './abstracts/payment.handler.abstract';

export class PaymeProcessPaymentHandler extends PaymentHandlerAbstract {
  constructor(private paymeProvider: PaymeProvider) {
    super();
  }

  isEnable() {
    return true;
  }

  async beforeProcessPaymentOrder() {
    return Promise.resolve(true);
  }

  async createTransaction(orderId: number): Promise<ITransaction> {
    return this.paymeProvider.findOrCreateTransaction(orderId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async processPaymentOrder(orderId: number, userId: number, params) {
    //  const transaction: ITransaction = await this.createTransaction(orderId);

    return {
      url: await this.paymeProvider.generateUrl(orderId),
    };
  }
}
