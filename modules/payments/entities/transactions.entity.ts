import { EntityBase } from '@base/entity.base';
import { IOrderEntity } from '@interfaces/order/order.interface';
import { PaymentSystemEnum } from '@interfaces/payments/payment.interface';
import type { ITransaction } from '@interfaces/payments/transacion.interface';
import { EnumTransactionOfdStates, EnumTransactionStates } from '@interfaces/payments/transacion.interface';
import { OrderEntity } from '@modules/orders/entities/order.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity()
export class TransactionsEntity extends EntityBase implements ITransaction {
  @Column({ unique: false, nullable: true })
  transaction_id?: string;

  @Column({ type: 'bigint', nullable: false })
  create_time: number;

  @Column({ type: 'bigint', nullable: true, default: 0 })
  perform_time: number | null;

  @Column({ type: 'bigint', nullable: true, default: 0 })
  cancel_time: number | null;

  @Column({ type: 'int', nullable: false })
  amountCents: number;

  @Column({ type: 'enum', nullable: false, enum: EnumTransactionStates })
  state: EnumTransactionStates;

  @Column({ nullable: false, type: 'enum', enum: EnumTransactionOfdStates, default: EnumTransactionOfdStates.DONE })
  ofdState: EnumTransactionOfdStates;

  @Column({ nullable: true })
  reason?: number | null;

  @Column({ type: 'text', nullable: true })
  receivers?: string | null;

  @Column('jsonb', { nullable: false, default: '{}' })
  extra_info?: Object;

  @OneToOne(type => OrderEntity)
  @JoinColumn({ name: 'order_id' })
  order: IOrderEntity;

  @Column()
  order_id: number;

  @Column({ nullable: true })
  ofd_url: string;

  @Column({ nullable: false, enum: PaymentSystemEnum })
  paymentSystem: PaymentSystemEnum;
}
