import { DateUtils } from '@infrastructure/date-utils/date.utils';
import { LoggerService } from '@infrastructure/logger/logger.service';
import type { ITransaction } from '@interfaces/payments/transacion.interface';
import { EnumTransactionStates } from '@interfaces/payments/transacion.interface';
import { LebronEvents } from '@modules/domain-events/events/lebron.events';
import { OrderCrudService } from '@modules/orders/services/order.crud.service';
import { OrderService } from '@modules/orders/services/order.service';
import type { TransactionsEntity } from '@modules/payments/entities/transactions.entity';
import { TransactionCrud } from '@modules/payments/services/cruds/transaction.crud';
import { UserRepository } from '@modules/users/repositories/user.repository';
import { Injectable } from '@nestjs/common';
import { exhaustiveCheck } from '@utils/exhaustive.check';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { TransactionRepository } from '../repositories/transaction.repository';

@Injectable()
export class TransactionStateService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly dateUtils: DateUtils,
    private readonly lebronEvents: LebronEvents,
    private readonly transactionCrud: TransactionCrud,
    private readonly loggerService: LoggerService,
    private userRepository: UserRepository,
    private orderCrudService: OrderCrudService,
    private orderService: OrderService,
  ) {}

  async changeTransactionState(
    transactionId: number,
    newState: EnumTransactionStates,
    addInfo?: ITransaction,
  ): Promise<ITransaction> {
    switch (newState) {
      case EnumTransactionStates.NEW:
        return this.toNew(transactionId, addInfo);
      case EnumTransactionStates.CANCEL:
        return this.toCancel(transactionId, addInfo);
      case EnumTransactionStates.PAID_CANCEL:
        return this.toPaidCancel(transactionId, addInfo);
      case EnumTransactionStates.PENDING:
        return this.toPending(transactionId, addInfo);
      case EnumTransactionStates.PERFORM:
        return this.toPerform(transactionId, addInfo);
      default:
        exhaustiveCheck(newState);

        throw new Error('invalid transaction state');
    }
  }

  private async toNew(transactionId: number, addInfo?: ITransaction): Promise<ITransaction> {
    const updatedTransaction: QueryDeepPartialEntity<ITransaction> = {
      ...(addInfo || {}),
      state: EnumTransactionStates.NEW,
    };

    return this.updateState(transactionId, updatedTransaction);
  }

  private async toCancel(transactionId: number, addInfo?: ITransaction): Promise<ITransaction> {
    return this.updateState(transactionId, {
      ...(addInfo || {}),
      state: EnumTransactionStates.CANCEL,
      cancel_time: this.dateUtils.toTimestamp(new Date()),
    } as QueryDeepPartialEntity<TransactionsEntity>);
  }

  private async toPerform(transactionId: number, addInfo?: ITransaction): Promise<ITransaction> {
    const transaction: ITransaction = await this.updateState(transactionId, {
      ...(addInfo || {}),
      state: EnumTransactionStates.PERFORM,
      perform_time: Number(this.dateUtils.toTimestamp(new Date())),
    } as QueryDeepPartialEntity<TransactionsEntity>);
    // call ofd events
    this.lebronEvents.sendReceipt(transaction.id);

    return transaction;
  }

  private async toPending(transactionId: number, addInfo?: ITransaction): Promise<ITransaction> {
    return this.updateState(transactionId, {
      ...(addInfo || {}),
      state: EnumTransactionStates.PENDING,
    } as QueryDeepPartialEntity<TransactionsEntity>);
  }

  private async toPaidCancel(transactionId: number, addInfo?: ITransaction): Promise<ITransaction> {
    return this.updateState(transactionId, {
      ...(addInfo || {}),
      state: EnumTransactionStates.PAID_CANCEL,
      cancel_time: this.dateUtils.toTimestamp(new Date()),
    });
  }

  private async updateState(
    transactionId: number,
    transaction: QueryDeepPartialEntity<TransactionsEntity>,
  ): Promise<ITransaction> {
    await this.transactionRepository.update({ id: transactionId }, transaction);

    return this.transactionCrud.findOneById(transactionId);
  }
}
