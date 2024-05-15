import { RepositoryAbstract } from '@abstracts/repository.abstract';
import { CreditCardEntity } from '@modules/payments/entities/card.entity';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CreditCardRepository extends RepositoryAbstract<CreditCardEntity> {
  constructor(private dataSource: DataSource) {
    super(CreditCardEntity, dataSource.createEntityManager());
  }
}
