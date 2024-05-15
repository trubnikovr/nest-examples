//TODO rename card.entity.ts

import { EntityBase } from '@base/entity.base';
import { PaymentSystemEnum } from '@interfaces/payments/payment.interface';
import type { ICreditCardEntity } from '@interfaces/user/credit.card.interface';
import { CreditCardStatuses, TypeOfCards, UniredExtraFiled } from '@interfaces/user/credit.card.interface';
import { IUser } from '@interfaces/user/user.interface';
import { UserEntity } from '@modules/users/entities/user.entity';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';

@Entity()
@Unique(['user_id', 'number'])
export class CreditCardEntity extends EntityBase implements ICreditCardEntity {
  @Column({ type: 'enum', enum: TypeOfCards })
  type: TypeOfCards;

  @Column({ nullable: false, enum: PaymentSystemEnum })
  paymentSystem: PaymentSystemEnum;

  @ManyToOne(() => UserEntity, (user) => user.cards, { eager: true })
  user: IUser;

  @Column({ type: 'bigint' })
  user_id?: number;

  @Column() // Добавлено поле "number"
  number: string;

  @Column()
  name: string;

  //TODO rename
  @Column() // Добавлено поле "expire_date"
  expire_date: string;

  @Column({ nullable: true }) // Добавлено поле "expire_date"
  phone?: string;

  @Column({ type: 'enum', enum: CreditCardStatuses, default: CreditCardStatuses.PendingActivation })
  status: CreditCardStatuses;

  @Column('jsonb', { nullable: false, default: '{}' })
  extraInfo?: UniredExtraFiled;
}
