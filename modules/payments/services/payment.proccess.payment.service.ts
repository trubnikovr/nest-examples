import { EnvironmentConfigService } from '@infrastructure/environment-config/environment-config.service';
import { LoggerService } from '@infrastructure/logger/logger.service';
import { EnumOrderStatuses } from '@interfaces/order/order.interface';
import { PaymentSystemEnum } from '@interfaces/payments/payment.interface';
import { OrderRepository } from '@modules/orders/repositories/order.repository';
import { OrderCrudService } from '@modules/orders/services/order.crud.service';
import { OrderPaidService } from '@modules/orders/services/order.paid.service';
import { OrderStatusService } from '@modules/orders/services/order.status.service';
import { PaymentServiceAbstract } from '@modules/payments/abstracts/payment.service.abstract';
import { PaymeProvider } from '@modules/payments/providers/payments/payme.provider';
import { UniredProvider } from '@modules/payments/providers/payments/unired.provider';
import { CreditCardRepository } from '@modules/payments/repositories/credit.card.repository';
import { TransactionRepository } from '@modules/payments/repositories/transaction.repository';
import { TransactionStateService } from '@modules/payments/services/transaction.status.service';
import type { PaymentHandlerAbstract } from '@modules/payments/strategies/process-payment/abstracts/payment.handler.abstract';
import { PaymeProcessPaymentHandler } from '@modules/payments/strategies/process-payment/payme.process.payment.handler';
import { UniredProcessPaymentHandler } from '@modules/payments/strategies/process-payment/unired.process.payment.handler';
import { SmsCodesService } from '@modules/sms-codes/services/sms-codes.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { BaseError } from '../../../../../shared/exceptions/BaseError';
import { PaymentProcessingException } from '../../../../../shared/exceptions/payment/PaymentProcessingException';

@Injectable()
export class PaymentProccessPaymentService extends PaymentServiceAbstract {
  constructor(
    private paymeProvider: PaymeProvider,
    private uniredProvider: UniredProvider,
    private orderCrudService: OrderCrudService,
    //TODo move to OrderBeforePayService
    private checkOrderBeforePaymentService: OrderStatusService,
    private readonly configService: EnvironmentConfigService,
    private readonly smsCodesService: SmsCodesService,
    private readonly logger: LoggerService,
    private transactionRepository: TransactionRepository,
    private creditCardRepository: CreditCardRepository,
    private orderRepository: OrderRepository,
    private readonly orderPaidService: OrderPaidService,
    private readonly transactionStateService: TransactionStateService,
  ) {
    super();
  }

  strategiesPayments: Record<PaymentSystemEnum, PaymentHandlerAbstract> = {
    [PaymentSystemEnum.PAYME]: new PaymeProcessPaymentHandler(this.paymeProvider),
    [PaymentSystemEnum.UNIRED]: new UniredProcessPaymentHandler(
      this.uniredProvider,
      this.configService,
      this.logger,
      this.smsCodesService,
      this.transactionRepository,
      this.creditCardRepository,
      this.orderRepository,
      this.orderPaidService,
      this.orderCrudService,
      this.transactionStateService,
    ),
  };

  getPayments(): string[] {
    return Object.keys(this.strategiesPayments)
      .filter(key => this.strategiesPayments[key as PaymentSystemEnum].isEnable())
      .map(key => key);
  }

  async executePayment(orderId: number, userId: number, paymentSystem: PaymentSystemEnum, params) {
    const order = await this.orderCrudService.findOneById(orderId);

    if (!order) {
      return new NotFoundException();
    }

    try {
      const canBuy = await this.checkOrderBeforePaymentService.canPay(orderId);

      if (!canBuy) {
        throw new BadRequestException('Error continue payment');
      }

      const result = await this.strategiesPayments[paymentSystem].processPaymentOrder(orderId, userId, params);

      return result;
    } catch (error) {
      //BaseError
      if (error instanceof BaseError && order) {
        order.errorText = error.message;
      }

      if (error instanceof PaymentProcessingException) {
        throw error;
      }

      await this.checkOrderBeforePaymentService.updateStatus(order, EnumOrderStatuses.CANCELLED);

      throw error;
    }
  }

  async beforeExecutePayment(orderId: number, userId: number, paymentSystem: PaymentSystemEnum, params) {
    const order = await this.orderCrudService.findOneById(orderId);

    if (!order) {
      return new NotFoundException();
    }

    try {
      const canBuy = await this.checkOrderBeforePaymentService.canPay(orderId);
      if (!canBuy) {
        throw new BadRequestException('Error continue payment');
      }
      const result = await this.strategiesPayments[paymentSystem].beforeProcessPaymentOrder(orderId, userId, params);

      return Promise.resolve();
    } catch (error) {
      //BaseError
      if (error instanceof BaseError && order) {
        order.errorText = error.message;
      }

      if (error instanceof PaymentProcessingException) {
        throw error;
      }

      await this.checkOrderBeforePaymentService.updateStatus(order, EnumOrderStatuses.CANCELLED);

      throw error;
    }
  }
}
