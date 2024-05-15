import type { EnvironmentConfigService } from '@infrastructure/environment-config/environment-config.service';
import type { LoggerService } from '@infrastructure/logger/logger.service';
import type { IOrderEntity } from '@interfaces/order/order.interface';
import { EnumOrderStatuses } from '@interfaces/order/order.interface';
import { PaymentSystemEnum } from '@interfaces/payments/payment.interface';
import type { ITransaction } from '@interfaces/payments/transacion.interface';
import { EnumTransactionStates } from '@interfaces/payments/transacion.interface';
import type { IUniredPaymentRequest } from '@interfaces/payments/unired.interface';
import type { ICreditCardEntity } from '@interfaces/user/credit.card.interface';
import { CreditCardStatuses, TypeOfCards } from '@interfaces/user/credit.card.interface';
import type { OrderRepository } from '@modules/orders/repositories/order.repository';
import type { OrderCrudService } from '@modules/orders/services/order.crud.service';
import type { OrderPaidService } from '@modules/orders/services/order.paid.service';
import type { UniredProvider } from '@modules/payments/providers/payments/unired.provider';
import type { CreditCardRepository } from '@modules/payments/repositories/credit.card.repository';
import type { TransactionRepository } from '@modules/payments/repositories/transaction.repository';
import type { TransactionStateService } from '@modules/payments/services/transaction.status.service';
import type { SmsCodesService } from '@modules/sms-codes/services/sms-codes.service';

import { PaymentErrorCode } from '@constants/errors/PaymentErrors';
import { BaseError } from '@exceptions/BaseError';
import { PaymentProcessingException } from '@exceptions/payment/PaymentProcessingException';
import { PaymentHandlerAbstract } from './abstracts/payment.handler.abstract';

export class UniredProcessPaymentHandler extends PaymentHandlerAbstract {
  constructor(
    private uniredProvider: UniredProvider,
    private readonly configService: EnvironmentConfigService,
    private readonly logger: LoggerService,
    private readonly smsCodesService: SmsCodesService,
    private readonly transactionRepository: TransactionRepository,
    private readonly creditCardRepository: CreditCardRepository,
    private readonly orderRepository: OrderRepository,
    private readonly orderPaidService: OrderPaidService,
    private readonly orderCrudService: OrderCrudService,
    private readonly transactionStateService: TransactionStateService,
  ) {
    super();
  }

  isEnable() {
    return true;
  }

  createTransaction() {
    throw new Error('dont need to create');
  }

  async beforeProcessPaymentOrder(orderId, userId, params: IUniredPaymentRequest) {
    try {
      if (!orderId) {
        throw new BaseError('UniredHandler - cardId is empty');
      }

      if (!userId) {
        throw new BaseError('UniredHandler - userId is empty');
      }

      const transaction: ITransaction = await this.transactionRepository.findOne({
        where: { order_id: orderId },
      });

      if (transaction) {
        throw new PaymentProcessingException(PaymentErrorCode.TransactionExists);
      }

      const order: IOrderEntity = await this.orderCrudService.findOneById(orderId);

      if (!order.user) {
        throw new PaymentProcessingException(PaymentErrorCode.UserNotFound);
      }

      if (userId !== order?.user.id) {
        throw new PaymentProcessingException(PaymentErrorCode.UserNotFound);
      }

      if (!order) {
        throw new PaymentProcessingException(PaymentErrorCode.OrderNotFound);
      }

      if (order.status !== EnumOrderStatuses.PENDING_PAY) {
        throw new PaymentProcessingException(PaymentErrorCode.OrderNotPendingStatus);
      }

      const card: ICreditCardEntity = await this.creditCardRepository.findOne({
        where: { id: params.cardId },
      });

      if (!card) {
        throw new PaymentProcessingException(PaymentErrorCode.CardNotFound);
      }

      if (!card.phone) {
        throw new PaymentProcessingException(PaymentErrorCode.CardNotFound);
      }

      switch (card.type) {
        case TypeOfCards.Humo: {
          await this.uniredProvider.createPayment(orderId, order.grand_price, card);
          break;
        }

        case TypeOfCards.Uzcard: {
          await this.uniredProvider.createPayment(orderId, order.grand_price, card);
          break;
        }
      }

      return Promise.resolve(true);
    } catch (error) {
      throw new BaseError(error.toString());
    }
  }

  async processPaymentOrder(orderId: number, userId: number, params: IUniredPaymentRequest) {
    if (!orderId) {
      throw new BaseError('UniredHandler - cardId is empty');
    }

    if (!params.cardId) {
      throw new BaseError('UniredHandler - orderId is empty');
    }

    if (!userId) {
      throw new BaseError('UniredHandler - userId is empty');
    }

    const transaction: ITransaction = await this.transactionRepository.findOne({
      where: { order_id: orderId },
    });

    if (transaction) {
      throw new PaymentProcessingException(PaymentErrorCode.TransactionExists);
    }

    const order: IOrderEntity = await this.orderCrudService.findOneById(orderId);

    if (!order.user) {
      throw new PaymentProcessingException(PaymentErrorCode.UserNotFound);
    }

    if (userId !== order?.user.id) {
      throw new PaymentProcessingException(PaymentErrorCode.UserNotFound);
    }

    if (!order) {
      throw new PaymentProcessingException(PaymentErrorCode.OrderNotFound);
    }

    if (order.status !== EnumOrderStatuses.PENDING_PAY) {
      throw new PaymentProcessingException(PaymentErrorCode.OrderNotPendingStatus);
    }

    const card: ICreditCardEntity = await this.creditCardRepository.findOne({
      where: { id: params.cardId },
    });

    if (!card) {
      throw new PaymentProcessingException(PaymentErrorCode.CardNotFound);
    }

    if (card.status !== CreditCardStatuses.Active) {
      throw new PaymentProcessingException(PaymentErrorCode.CardIsNotActive);
    }

    if (card.paymentSystem !== PaymentSystemEnum.UNIRED) {
      throw new PaymentProcessingException(PaymentErrorCode.CardNotFound);
    }

    const uniredTransaction = await this.uniredProvider.executePayment(
      orderId,
      order.grand_price,
      card,
      params.smsCode,
    );

    const newTransaction = await this.transactionRepository.save(uniredTransaction);

    await this.transactionRepository.save(newTransaction);

    if (newTransaction.state === EnumTransactionStates.PERFORM) {
      //TODO thing about this and how to call event, maybe move to
      await this.transactionStateService.changeTransactionState(
        newTransaction.id,
        EnumTransactionStates.PERFORM,
        newTransaction,
      );

      await this.orderPaidService.toPaid(order);
    }

    return true;
  }
}
