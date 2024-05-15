import { DateUtilsModule } from '@infrastructure/date-utils/date-utils.module';
import { EnvironmentConfigModule } from '@infrastructure/environment-config/environment-config.module';
import { EnvironmentConfigService } from '@infrastructure/environment-config/environment-config.service';
import { DomainEventsModule } from '@modules/domain-events/domain-events.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { OrderRepository } from '@modules/orders/repositories/order.repository';
import { TransactionsEntity } from '@modules/payments/entities/transactions.entity';
import { CreditCardRepository } from '@modules/payments/repositories/credit.card.repository';
import { CreditCardsService } from '@modules/payments/services/credit.cards.service';
import { PaymentProccessPaymentService } from '@modules/payments/services/payment.proccess.payment.service';
import { UsersModule } from '@modules/users/users.module';
import { Module } from '@nestjs/common';

import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionsService } from './services/backend/transactions.service';
import { TransactionStateService } from './services/transaction.status.service';
import { TransactionCrud } from '@modules/payments/services/cruds/transaction.crud';
import { SmsCodesModule } from '@modules/sms-codes/sms-codes.module';
import { UniredProvider } from '@modules/payments/providers/payments/unired.provider';
import { PaymeProvider } from '@modules/payments/providers/payments/payme.provider';

@Module({
  imports: [
    EnvironmentConfigModule,
    DomainEventsModule,
    OrdersModule,
    UsersModule,
    DomainEventsModule,
    SmsCodesModule,
    DateUtilsModule,
  ],
  providers: [
    TransactionCrud,
    EnvironmentConfigService,
    TransactionsEntity,
    OrderRepository,
    UniredProvider,
    PaymeProvider,
    PaymentProccessPaymentService,
    TransactionRepository,
    CreditCardsService,
    CreditCardRepository,
    TransactionsService,
    TransactionStateService,
  ],
  exports: [
    PaymeProvider,
    TransactionCrud,
    PaymentProccessPaymentService,
    UniredProvider,
    CreditCardsService,
    TransactionRepository,
    CreditCardRepository,
    TransactionsService,
  ],
})
export class PaymentsModule {}
