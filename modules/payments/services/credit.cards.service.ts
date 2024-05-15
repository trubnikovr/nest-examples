import { LoggerService } from '@infrastructure/logger/logger.service';
import { PaymentSystemEnum } from '@interfaces/payments/payment.interface';
import type { ICreditCardEntity } from '@interfaces/user/credit.card.interface';
import { CreditCardStatuses } from '@interfaces/user/credit.card.interface';
import type { CreditCardEntity } from '@modules/payments/entities/card.entity';
import { UniredProvider } from '@modules/payments/providers/payments/unired.provider';
import { CreditCardRepository } from '@modules/payments/repositories/credit.card.repository';
import { UniredCreditCardHandler } from '@modules/payments/strategies/credit-card/unired/unired.credit.card.handler';
import { SmsCodesService } from '@modules/sms-codes/services/sms-codes.service';
import { UserRepository } from '@modules/users/repositories/user.repository';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hideCardNumbers } from '@utils/credit-card.util';

import { PaymentErrorCode } from '../../../../../shared/constants/errors/PaymentErrors';
import { BaseError } from '../../../../../shared/exceptions/BaseError';
import { PaymentProcessingException } from '../../../../../shared/exceptions/payment/PaymentProcessingException';
import { BaseCrudService } from '../../../core/crud/base.crud.service';
import type { CreditCardHandlerAbstract } from '../strategies/credit-card/abstracts/credit.card.handler.abstract';

@Injectable()
export class CreditCardsService {
  private creditCardRepositoryBaseCrudService: BaseCrudService<CreditCardEntity>;

  paymentSystems: Record<PaymentSystemEnum, CreditCardHandlerAbstract> = {
    [PaymentSystemEnum.UNIRED]: new UniredCreditCardHandler(this.uniredProvider, this.smsCodesService),
    [PaymentSystemEnum.PAYME]: undefined,
  };

  constructor(
    private readonly creditCardRepository: CreditCardRepository,
    protected userRepository: UserRepository,
    protected uniredProvider: UniredProvider,
    private readonly smsCodesService: SmsCodesService,
    private readonly loggerService: LoggerService,
  ) {
    this.creditCardRepositoryBaseCrudService = new BaseCrudService(creditCardRepository);
  }

  async prepareCardRegister(
    createCreditCardDto: Omit<ICreditCardEntity, 'status' | 'type' | 'user'>,
    user_id: number,
  ): Promise<{ cardId: number; phone: string }> {
    const user = await this.userRepository.findOne({ where: { id: user_id } });

    if (!user) {
      // Обработка ошибки, если пользователь не найден
      throw new NotFoundException('User not found');
    }

    const creditCardEntity: ICreditCardEntity = await this.creditCardRepositoryBaseCrudService.findOne({
      where: {
        number: createCreditCardDto.number,
      },
    });

    if (creditCardEntity && creditCardEntity.status !== CreditCardStatuses.Active) {
      await this.creditCardRepositoryBaseCrudService.delete(creditCardEntity.id);
    }

    if (creditCardEntity && creditCardEntity.status === CreditCardStatuses.Active) {
      throw new BadRequestException('Карта уже используется');
    }

    const creditCardHandler = this.getCreditCardHandler(createCreditCardDto.paymentSystem);

    const cardInfo = await creditCardHandler.getInfo({
      cardExpireDate: createCreditCardDto.expire_date,
      cardNumber: createCreditCardDto.number,
    });

    if (!cardInfo.success) {
      throw new BaseError(String(cardInfo.errors.join(',')));
    }

    const creditCard: ICreditCardEntity = {
      ...cardInfo.info,
      name: createCreditCardDto.name,
      user,
    };

    const card = await this.creditCardRepositoryBaseCrudService.save(creditCard);

    const result = await creditCardHandler.prepareCardRegister(creditCard);

    if (!result.success) {
      throw new BaseError(String(result.error));
    }

    await this.creditCardRepositoryBaseCrudService.save({ ...card, extraInfo: result.extraInfo });

    if (!result?.extraInfo?.phone) {
      throw new PaymentProcessingException(PaymentErrorCode.UniredError, {
        message: String(result.error),
      });
    }

    return {
      cardId: card.id,
      phone: this.hidePhoneNumbers(result.extraInfo.phone),
    };
  }

  async delete(id: number): Promise<void> {
    // Найдите кредитную карту, которую вы хотите удалить
    const creditCard = await this.creditCardRepository.findOne({
      where: { id },
    });

    if (!creditCard) {
      // Обработка ошибки, если кредитная карта не найдена
      throw new NotFoundException('Credit card not found');
    }

    // Удалите кредитную карту из базы данных
    await this.creditCardRepository.remove(creditCard);
  }

  async all(user_id: number, filter?: Partial<ICreditCardEntity>) {
    const foundCards = await this.creditCardRepositoryBaseCrudService.findAll({
      user: {
        id: user_id,
      },
      ...filter,
    });

    for (const card of foundCards.data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      card.number = hideCardNumbers(card.number);
      card.phone = this.hidePhoneNumbers(card.phone);
    }

    return foundCards;
  }

  // TODO move to utils
  hidePhoneNumbers(str: string): string {
    if (!str) {
      return '';
    }

    if (str.includes('*')) {
      return str;
    }

    if (str.length > 8) {
      // Оставляем первые 4 символа видимыми, заменяем среднюю часть на звездочки, и оставляем последние 4 символа
      str = str.slice(0, 4) + '*'.repeat(str.length - 8) + str.slice(-4);
    }

    // Проверяем, начинается ли строка с "+". Если нет, добавляем "+" в начало.
    if (!str.startsWith('+')) {
      str = '+' + str;
    }

    // Если длина строки 4 символа или меньше, возвращаем исходную строку
    return str;
  }

  getCreditCardHandler(paymentSystem: PaymentSystemEnum): CreditCardHandlerAbstract {
    try {
      if (!this.paymentSystems[paymentSystem]) {
        throw new Error('not found');
      }

      return this.paymentSystems[paymentSystem];
    } catch {
      throw new Error(`handler cant find ${paymentSystem}`);
    }
  }

  async activationCard(cardId: number, smsCode: string) {
    try {
      const creditCardEntity = await this.creditCardRepositoryBaseCrudService.findOneById(cardId);

      if (!creditCardEntity) {
        // Обработка ошибки, если кредитная карта не найдена
        throw new NotFoundException('Credit card not found');
      }

      const creditCardHandler = this.getCreditCardHandler(creditCardEntity.paymentSystem);

      if (!creditCardHandler) {
        throw new Error('handler cant find');
      }

      const result = await creditCardHandler.registerCard({ creditCard: creditCardEntity, smsCode });

      if (!result.success) {
        throw new Error(result.errors.join(', '));
      }

      await this.creditCardRepositoryBaseCrudService.update(cardId, {
        ...creditCardEntity,
        ...result.card,
        status: CreditCardStatuses.Active,
      });

      return true;
    } catch (error) {
      this.loggerService.error(this.constructor.name, 'activationCard' + error.toString());

      throw error;
    }
  }
}
