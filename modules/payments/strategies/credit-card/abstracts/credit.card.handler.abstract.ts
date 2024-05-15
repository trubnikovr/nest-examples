import type { ICreditCardEntity, UniredExtraFiled } from '@interfaces/user/credit.card.interface';

export abstract class CreditCardHandlerAbstract {
  abstract registerCard({
    creditCard,
    smsCode,
  }: {
    creditCard: ICreditCardEntity;
    smsCode: string;
  }): Promise<{ success: boolean; errors?: string[]; card?: Partial<ICreditCardEntity> }>;

  abstract getInfo({
    cardNumber,
    cardExpireDate,
  }: {
    cardExpireDate: string;
    cardNumber: string;
  }): Promise<{ success: boolean; errors?: string[]; info?: any }>;

  abstract prepareCardRegister(
    creditCardEntity: ICreditCardEntity,
  ): // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Promise<{ success: boolean; error?: string[]; extraInfo?: UniredExtraFiled }>;
}
