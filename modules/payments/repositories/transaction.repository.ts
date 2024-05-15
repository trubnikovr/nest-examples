import { RepositoryAbstract } from '@abstracts/repository.abstract';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { TransactionsEntity } from '../entities/transactions.entity';

@Injectable()
export class TransactionRepository extends RepositoryAbstract<TransactionsEntity> {
  constructor(private dataSource: DataSource) {
    super(TransactionsEntity, dataSource.createEntityManager());
  }
}
