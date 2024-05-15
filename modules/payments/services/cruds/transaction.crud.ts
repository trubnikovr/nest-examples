import type { ITransaction } from '@interfaces/payments/transacion.interface';
import { TransactionRepository } from '@modules/payments/repositories/transaction.repository';
import { Injectable } from '@nestjs/common';

import { BaseCrudService } from '../../../../core/crud/base.crud.service';

@Injectable()
export class TransactionCrud extends BaseCrudService<ITransaction> {
  constructor(protected repository: TransactionRepository) {
    super(repository);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async findOneById(id: number): Promise<ITransaction> {
    return this.repository.findOneOrFail({
      where: { id },
      relations: ['order', 'order.user'],
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getTransactionByOrderId(orderId: number): Promise<ITransaction> {
    return this.repository.findOne({
      where: {
        order_id: orderId,
      },
    });
  }
}
