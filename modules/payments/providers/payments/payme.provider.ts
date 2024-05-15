import { DateUtils } from '@infrastructure/date-utils/date.utils';
import { EnvironmentConfigService } from '@infrastructure/environment-config/environment-config.service';
import type { IOrderEntity } from '@interfaces/order/order.interface';
import type { IPaymeParamRequestInterface } from '@interfaces/payments/payme.interface';
import { PaymeMethods } from '@interfaces/payments/payme.interface';
import { PaymentSystemEnum } from '@interfaces/payments/payment.interface';
import type { ITransaction } from '@interfaces/payments/transacion.interface';
import { EnumTransactionOfdStates, EnumTransactionStates } from '@interfaces/payments/transacion.interface';
import { OrderRepository } from '@modules/orders/repositories/order.repository';
import { OrderCrudService } from '@modules/orders/services/order.crud.service';
import { OrderPaidService } from '@modules/orders/services/order.paid.service';
import { TransactionRepository } from '@modules/payments/repositories/transaction.repository';
import { TransactionStateService } from '@modules/payments/services/transaction.status.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { exhaustiveCheck } from '@utils/exhaustive.check';

import { BaseError } from '@exceptions/BaseError';
import { PaymeError, REASON, TIME_EXPIRED, TransactionState } from '../../../../constants/payments';

//TODO need to split and refactoring
@Injectable()
export class PaymeProvider {
  // private client: AxiosAgent;

  constructor(
    private readonly orderPaidService: OrderPaidService,
    private transactionRepository: TransactionRepository,
    private orderRepository: OrderRepository,
    private orderCrudService: OrderCrudService,
    private configService: EnvironmentConfigService,
    private transactionStateService: TransactionStateService,
    private dateUtils: DateUtils,
  ) {}

  // onModuleInit() {
  //   //@todo move to env https://test.paycom.uz
  //   this.client = new AxiosAgent('https://test.paycom.uz', {
  //     Authorization: 'Basic ' + Buffer.from('Paycom' + ':' + this.configService.getPaymeKey()).toString('base64'),
  //   });
  // }

  isAuthValid(token: string) {
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    return token === 'Basic ' + Buffer.from('Paycom:' + this.configService.getPaymeKey()).toString('base64');
  }

  async execute(body: IPaymeParamRequestInterface): Promise<unknown> {
    try {
      const method: IPaymeParamRequestInterface['method'] = body.method;
      const params: IPaymeParamRequestInterface['params'] = body.params;
      console.log(method);

      switch (method) {
        case PaymeMethods.CreateTransaction: {
          return this.createTransactionNew(params);
        }

        case PaymeMethods.CheckTransaction:
          return this.checkTransaction(params);

        case PaymeMethods.CheckPerformTransaction:
          return this.checkPerformTransaction(params);

        case PaymeMethods.PerformTransaction:
          return this.performTransaction(params);

        case PaymeMethods.CancelTransaction:
          return this.cancelTransaction(params);

        default:
          exhaustiveCheck(method as never);

          throw new Error('PaymeProvider - method is not support');
      }
      // eslint-disable-next-line sonarjs/no-useless-catch
    } catch (error) {
      throw error;
    }
  }

  async createTransactionNew(params: IPaymeParamRequestInterface['params']): Promise<unknown> {
    const status = await this.checkPerformTransaction(params);

    if (status.error) {
      return status;
    }

    const transaction = await this.transactionRepository.findOneBy({ transaction_id: params.id });

    if (transaction) {
      if (transaction.state !== EnumTransactionStates.PENDING) {
        return {
          error: PaymeError.AlreadyDone,
        };
      }

      const currentTime = this.dateUtils.toTimestamp(new Date());
      const isTransactionExpired = currentTime - transaction.create_time < TIME_EXPIRED;

      if (!isTransactionExpired) {
        await this.transactionRepository.update(
          { transaction_id: params.id },
          {
            state: EnumTransactionStates.CANCEL,
            reason: REASON.TIMEOUT_ERROR,
          },
        );

        return {
          error: PaymeError.CantDoOperation,
          id: params.id,
        };
      }

      return {
        result: {
          create_time: Number(transaction.create_time),
          transaction: transaction.id,
          state: TransactionState.Pending,
        },
      };
    }

    const t = await this.transactionRepository.findOneBy({ order_id: Number(params.account.order_id) });

    if (t) {
      if (t.state === EnumTransactionStates.PERFORM) {
        return {
          error: PaymeError.AlreadyDone,
          id: params.id,
        };
      }

      if (t.state === EnumTransactionStates.PENDING) {
        return {
          error: PaymeError.Pending,
          id: params.id,
        };
      }
    }

    const newTransaction: ITransaction = {
      transaction_id: params.id,
      paymentSystem: PaymentSystemEnum.PAYME,
      create_time: Date.now(),
      amountCents: params.amount,
      state: EnumTransactionStates.PENDING,
      order_id: Number(params.account.order_id),
      ofdState: EnumTransactionOfdStates.NEW,
    };

    const tr: ITransaction = await this.transactionRepository.save(newTransaction);

    return {
      result: {
        create_time: Number(newTransaction.create_time),
        transaction: tr.id,
        state: this.getState(tr.state),
      },
    };
  }

  async checkTransaction(params: IPaymeParamRequestInterface['params']): Promise<unknown> {
    const transaction: ITransaction = await this.transactionRepository.findOneBy({ transaction_id: params.id });

    if (!transaction) {
      return {
        error: PaymeError.TransactionNotFound,
      };
    }

    return {
      result: {
        create_time: Number(transaction.create_time),
        perform_time: Number(transaction.perform_time),
        cancel_time: Number(transaction.cancel_time),
        transaction: transaction.id,
        state: this.getState(transaction.state),
        reason: transaction.reason,
      },
    };
  }

  async checkPerformTransaction(params: IPaymeParamRequestInterface['params']): Promise<{
    id?: string;
    result?: any;
    error?: any;
  }> {
    const orderEntity = await this.orderRepository.findOneBy({
      id: Number.parseInt(params.account.order_id, 10),
      total_price: params.amount / 100,
    });

    if (orderEntity) {
      return {
        result: {
          allow: true,
        },
      };
    }

    return {
      error: PaymeError.OrderNotFound,
      id: params.id,
    };
  }

  async performTransaction(params: IPaymeParamRequestInterface['params']): Promise<unknown> {
    const transaction = await this.transactionRepository.findOne({
      where: {
        transaction_id: params.id,
      },
      relations: ['order'],
    });

    if (!transaction) {
      return {
        error: PaymeError.TransactionNotFound,
      };
    }

    await this.transactionStateService.changeTransactionState(Number(transaction.id), EnumTransactionStates.PERFORM);

    const order = await this.orderCrudService.findOneById(transaction.order_id);

    if (!order) {
      throw new BaseError(`order not found - ${transaction.id}`);
    }

    await this.orderPaidService.toPaid(order);

    return {
      result: {
        transaction: transaction.id,
        perform_time: Number(transaction.create_time),
        state: this.getState(EnumTransactionStates.PERFORM),
      },
    };
  }

  async cancelTransaction(params: IPaymeParamRequestInterface['params']): Promise<unknown> {
    const transaction: ITransaction = await this.transactionRepository.findOneBy({ transaction_id: params.id });

    if (!transaction) {
      return {
        error: PaymeError.TransactionNotFound,
      };
    }

    if (transaction.reason === params.reason) {
      return {
        result: {
          transaction: transaction.id,
          cancel_time: Number(transaction.cancel_time),
          state: this.getState(transaction.state),
        },
      };
    }

    const updatedInfo = {
      state:
        transaction.state === EnumTransactionStates.PERFORM
          ? EnumTransactionStates.PAID_CANCEL
          : EnumTransactionStates.CANCEL,
      reason: REASON.REFUND,
    };
    const savedTransaction = await this.transactionStateService.changeTransactionState(
      Number(params.id),
      updatedInfo.state,
    );

    return {
      result: {
        transaction: transaction.id,
        cancel_time: Number(savedTransaction.cancel_time),
        state: this.getState(updatedInfo.state),
      },
    };
  }

  // ac.order_id=197;a=500)
  async generateUrl(order_id: number): Promise<string> {
    const order: IOrderEntity = await this.orderRepository.findOne({ where: { id: order_id } });

    if (!order) {
      throw new NotFoundException('PaymeProvider generateUrl - order not found');
    }

    const params = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'ac.order_id': order.id,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "a": order.total_price * 100, // convert to cent(tii)
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "m": this.configService.getPaymeMerchantId(),
    };
    console.info('params', params);

    const paramString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join(';');

    return 'https://checkout.paycom.uz/' + Buffer.from(paramString).toString('base64');
  }

  async createTransactionByOrderId(orderId: number) {
    const order: IOrderEntity = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('PaymeProvider createTransactionByOrderId - order not found');
    }

    await this.createTransactionNew({
      amount: order.total_price * 100,
      time: 0,
      account: {
        order_id: String(orderId),
      },
    });
  }

  async findOrCreateTransaction(orderId): Promise<ITransaction> {
    const transaction: ITransaction = await this.transactionRepository.findOne({ where: { order_id: orderId } });

    if (transaction) {
      return transaction;
    }

    const order: IOrderEntity = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('PaymeProvider createTransactionByOrderId - order not found');
    }

    const newTransactionEntity: ITransaction = {
      paymentSystem: PaymentSystemEnum.PAYME,
      create_time: Date.now(),
      amountCents: order.total_price * 100,
      state: EnumTransactionStates.NEW,
      order_id: Number(order.id),
      ofdState: EnumTransactionOfdStates.NEW,
    };

    const newTransaction = await this.transactionRepository.save(newTransactionEntity);

    return newTransaction;
  }

  // @ToDo not good thing how ot solve
  private getState(state: EnumTransactionStates) {
    if (state === EnumTransactionStates.PENDING) {
      return TransactionState.Pending;
    }

    if (state === EnumTransactionStates.PERFORM) {
      return TransactionState.Paid;
    }

    if (state === EnumTransactionStates.CANCEL) {
      return TransactionState.PendingCanceled;
    }

    if (state === EnumTransactionStates.PAID_CANCEL) {
      return TransactionState.PaidCanceled;
    }

    throw new Error('State not fount ' + state);
  }
}
