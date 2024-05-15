import { PaymentSystemEnum } from '@interfaces/payments/payment.interface';
import type { ICreditCardEntity, UniredExtraFiled } from '@interfaces/user/credit.card.interface';
import { CreditCardStatuses, TypeOfCards } from '@interfaces/user/credit.card.interface';
import type { UniredProvider } from '@modules/payments/providers/payments/unired.provider';
import type { SmsCodesService } from '@modules/sms-codes/services/sms-codes.service';

import { PaymentErrorCode } from '../../../../../../../shared/constants/errors/PaymentErrors';
import { BaseError } from '../../../../../../../shared/exceptions/BaseError';
import { PaymentProcessingException } from '../../../../../../../shared/exceptions/payment/PaymentProcessingException';
import { CreditCardHandlerAbstract } from '../abstracts/credit.card.handler.abstract';

export class UniredCreditCardHandler extends CreditCardHandlerAbstract {
  constructor(private uniredProvider: UniredProvider, private readonly smsCodesService: SmsCodesService) {
    super();
  }

  async registerCard({
    creditCard,
    smsCode,
  }): Promise<{ success: boolean; errors?: string[]; card?: Partial<ICreditCardEntity> }> {
    try {
      const cardNumber = creditCard.number;
      const expireDate = creditCard.expire_date;
      const [month, year] = expireDate.split('/');

      switch (creditCard.type) {
        case TypeOfCards.Uzcard: {
          if (!month || !year) {
            throw new Error(`${cardNumber} is wrong cardExpireDate`);
          }

          const result = await this.uniredProvider.registerCardUzcard(creditCard.extraInfo.extId, smsCode);

          if (result.errors) {
            throw new Error(result.errors.join(','));
          }

          return {
            success: true,
            card: {
              phone: result?.card?.phone,
            },
          };
        }

        case TypeOfCards.Humo: {
          if (!creditCard.user) {
            throw new Error(`${cardNumber} user is empty`);
          }

          const isVerification = await this.smsCodesService.verify({
            phoneNumber: creditCard.extraInfo.phone,
            smsCode,
          });

          if (!isVerification) {
            throw new PaymentProcessingException(PaymentErrorCode.SmsIsWrong);
          }

          const result = await this.uniredProvider.registerCard(cardNumber, year, month);

          if (result.error) {
            throw new BaseError(result.error.join(', '));
          }

          return {
            success: true,
          };

          break;
        }

        default:
          throw new Error(`Not support card type ${creditCard.type}`);
          break;
      }
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
      };
    }
  }

  async prepareCardRegister(
    creditCardEntity: ICreditCardEntity,
  ): Promise<{ success: boolean; error?: string[]; extraInfo?: UniredExtraFiled }> {
    try {
      switch (creditCardEntity.type) {
        case TypeOfCards.Humo: {
          if (!creditCardEntity.phone) {
            throw new BaseError('Phone number is missing');
          }

          await this.smsCodesService.create(Number(creditCardEntity.phone));

          return {
            success: true,
            extraInfo: { phone: String(creditCardEntity.phone) } as UniredExtraFiled,
          };
        }

        case TypeOfCards.Uzcard: {
          const [month, year] = creditCardEntity.expire_date.split('/');

          if (!month || !year) {
            throw new BaseError(`${creditCardEntity.number} is wrong cardExpireDate`);
          }

          const result = await this.uniredProvider.sendSmsForRegistrationUzcard(creditCardEntity.number, year, month);

          if (result?.errors?.length) {
            throw new BaseError(result.errors.join(','));
          }

          return {
            success: result.success,
            extraInfo: { extId: result.extId, phone: result.phone } as UniredExtraFiled,
          };
        }

        default:
          throw new BaseError(`Not support card type ${creditCardEntity.number}`, 400);
          break;
      }
    } catch (error) {
      return {
        success: false,
        error: [error.toString()],
      };
    }
  }

  async getInfo({
    cardNumber,
    cardExpireDate,
  }: {
    cardExpireDate: string;
    cardNumber: string;
  }): Promise<{ success: boolean; errors?: string[]; info?: ICreditCardEntity }> {
    try {
      const result = await this.uniredProvider.getInfoCard(cardNumber);

      if (!result.success) {
        throw new BaseError(result.errors.join(','));
      }

      const type = this.uniredProvider.getCardType(result.info.pc_type);

      return {
        success: true,
        info: {
          expire_date: cardExpireDate,
          extraInfo: undefined,
          name: '',
          number: cardNumber,
          paymentSystem: PaymentSystemEnum.UNIRED,
          phone: result.info.phone,
          status: CreditCardStatuses.PendingActivation,
          type,
          user: undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
      };
    }
  }
}
