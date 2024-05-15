import { PaymentErrorCode, PaymentErrorMessages } from '@constants/errors/PaymentErrors';
import { BaseError } from '@exceptions/BaseError';
import { PaymentProcessingException } from '@exceptions/payment/PaymentProcessingException';
import AxiosAgent from '@infrastructure/axios/class/axios.agent';
import { EnvironmentConfigService } from '@infrastructure/environment-config/environment-config.service';
import { LoggerService } from '@infrastructure/logger/logger.service';
import { PaymentSystemEnum } from '@interfaces/payments/payment.interface';
import type { ITransaction } from '@interfaces/payments/transacion.interface';
import { EnumTransactionOfdStates, EnumTransactionStates } from '@interfaces/payments/transacion.interface';
import type {
  CardRegisterRequest,
  CardRegisterRequestUzcard,
  CardRegisterResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  CreatePaymentRequest,
  CreatePaymentResponse,
  ICardInfoRequest,
  IGetCardTypeRequest,
  IUniredRequest,
  LoginRequest,
  LoginResponse,
  pcType,
  ResponseData,
} from '@interfaces/payments/unired.interface';
import { UniredCreatePaymentStates, UniredMethods } from '@interfaces/payments/unired.interface';
import type { ICreditCardEntity } from '@interfaces/user/credit.card.interface';
import { TypeOfCards } from '@interfaces/user/credit.card.interface';
import { Injectable } from '@nestjs/common';
import { exhaustiveCheck } from '@utils/exhaustive.check';
// eslint-disable-next-line import/no-namespace
import * as moment from 'moment-timezone';

import { UniredErrors } from '../../../../constants/payments/unired.errors';

//TODO need to split and refactoring
@Injectable()
export class UniredProvider {
  private client: AxiosAgent;

  private accessToken: string = undefined;

  constructor(
    private readonly configService: EnvironmentConfigService,
    private readonly loggerService: LoggerService,
  ) {}

  onModuleInit() {
    this.client = new AxiosAgent(this.configService.getUniredApiUrl(), {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Type': 'Application/json',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Accept": 'Application/json',
    });
  }

  async getInfoCard(cardNumber: string): Promise<{ success: boolean; errors?: string[]; info?: ICardInfoRequest }> {
    try {
      const method = UniredMethods.CARD_INFO;
      const params = { number: cardNumber.toString() };
      const payload = this.getPayload<IGetCardTypeRequest>(method, params);
      const response = await this.makeRequest<IGetCardTypeRequest, ICardInfoRequest>(payload);

      return {
        success: true,
        info: response.result,
      };
    } catch (error) {
      this.loggerService.error(this.constructor.name, error.toString());

      return {
        success: false,
        errors: [error.toString()],
      };
    }
  }

  getCardType(_pcType: pcType): TypeOfCards {
    if (!_pcType) {
      throw new PaymentProcessingException(PaymentErrorCode.CardNotFound);
    }

    switch (_pcType) {
      case 1:
        return TypeOfCards.Uzcard;
      case 3:
        return TypeOfCards.Humo;
      default:
        exhaustiveCheck(_pcType);

        // TODO add never and throw error
        throw new BaseError(`${_pcType} - not found`, 0);
    }
  }

  async registerCardUzcard(
    extId,
    smsCode,
  ): Promise<{ success: boolean; errors?: string[]; card?: Partial<CardRegisterResponse> }> {
    try {
      if (!smsCode || !extId) {
        throw new Error('smsCode or extId are empty');
      }

      //@ToDo add validation
      const result = await this.makeRequest<CardRegisterRequestUzcard, CardRegisterResponse>(
        this.getPayload<CardRegisterRequestUzcard>(UniredMethods.CARD_NEW_OTP_VERIFY, {
          ext_id: extId,
          code: smsCode,
        }),
      );

      return {
        success: true,
        card: {
          phone: result.result.phone,
        },
      };
    } catch (error) {
      this.loggerService.error(this.constructor.name, error.toString());

      if (error instanceof BaseError) {
        return {
          success: false,
          errors: [error.toString()],
        };
      }

      return {
        success: false,
        errors: [PaymentErrorMessages[PaymentErrorCode.UnknownError]],
      };
    }
  }

  async registerCard(
    cardNumber,
    cardExpireYear, // pay attention format is YYmm,
    cardExpireMonth,
  ): Promise<{ success: boolean; error?: string[]; card?: Partial<CardRegisterResponse> }> {
    try {
      //@ToDo add validation
      const result = await this.makeRequest<CardRegisterRequest, CardRegisterResponse>(
        this.getPayload<CardRegisterRequest>(UniredMethods.CARD_REGISTER, {
          number: cardNumber,
          expire: `${cardExpireYear}${cardExpireMonth}`,
        }),
      );

      return {
        success: true,
        card: {
          phone: result?.result?.phone,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: [error.toString()],
      };
    }
  }

  //refactoring need to move
  async executePayment(
    orderId: number,
    amountSum: number,
    card: ICreditCardEntity,
    smsCode: string,
  ): Promise<ITransaction> {
    try {
      //@ToDo add validation
      const createPaymentResponse = await this.confirmPay(String(orderId), smsCode);

      if (createPaymentResponse.error) {
        throw new PaymentProcessingException(PaymentErrorCode.UniredError, {
          message: String(createPaymentResponse.error.message),
        });
      }

      const result = createPaymentResponse.result;

      if (![UniredCreatePaymentStates.success].includes(result.state)) {
        throw new PaymentProcessingException(PaymentErrorCode.UniredError, {
          message: 'Транзакция не прошла ',
        });
      }

      const newTransactionData: ITransaction = {
        paymentSystem: PaymentSystemEnum.UNIRED,
        create_time: Date.now(),
        amountCents: amountSum * 100, // convert uzb to cent(tii)
        state: EnumTransactionStates.PERFORM,
        order_id: Number(orderId),
        extra_info: { cardId: card.id },
        ofdState: EnumTransactionOfdStates.NEW,
      };

      return newTransactionData;
    } catch (error) {
      this.loggerService.error(this.constructor.name, 'UniredProvider - createTransaction - ' + error.toString());

      if (error instanceof PaymentProcessingException) {
        this.loggerService.error(
          this.constructor.name,
          'UniredProvider - Unired Error - ' + error?.additionalData?.message,
        );

        throw error;
      }

      throw new PaymentProcessingException(PaymentErrorCode.UniredError);
    }
  }

  // ToDo refactoring
  getPaymentDataByCardNumber(cardNumber: ICreditCardEntity): Pick<CreatePaymentRequest, 'merchant_id' | 'terminal_id'> {
    //Uzcard ID мерчанта/ID терминала:  904813061/92449388
    // Humo ID мерчанта/ID терминала:  011860563844602/236118S3
    if (cardNumber.type === TypeOfCards.Uzcard) {
      return {
        merchant_id: '904813061',
        terminal_id: '92449388',
      };
    }

    // if the card is humo
    return {
      merchant_id: '011860563844602',
      terminal_id: '236118S3',
    };
  }

  private async getToken(): Promise<string> {
    try {
      this.accessToken = await this.login(
        this.configService.getUniredUsername(),
        this.configService.getUniredPassword(),
      );

      return this.accessToken;
    } catch {
      this.loggerService.error(this.constructor.name, "Unired Service - couldn't take token");

      throw new Error("Unired Service - couldn't take token");
    }
  }

  private async login(username: string, password: string): Promise<string> {
    try {
      const { data }: { data: ResponseData<LoginResponse> } = await this.client.post(
        '',
        this.getPayload<LoginRequest>(UniredMethods.LOGIN, { username, password }),
      );

      if (data.error) {
        this.loggerService.error(this.constructor.name, data.error.message.toString());

        throw new Error('Login failed');
      }

      return data?.result?.access_token;
    } catch (error) {
      this.accessToken = undefined;
      this.loggerService.error(this.constructor.name, 'Failed to login' + error.toString());

      throw error;
    }
  }

  getPayload<T>(method: UniredMethods, params: T): IUniredRequest<T> {
    return {
      jsonrpc: '2.0',
      id: `Lebron_${moment().unix()}`,
      method,
      params,
    };
  }

  private async makeRequest<T, R>(params: IUniredRequest<T>): Promise<ResponseData<R>> {
    // eslint-disable-next-line no-useless-catch
    try {
      this.client.addHeader({ Authorization: `Bearer ${await this.getToken()}` });

      const { data }: { data: ResponseData<R> } = await this.client.post('', params);
      console.log(data)
      if (data.error) {
        const errorCode = data?.error?.code || 0;

        if (errorCode === UniredErrors.TokenIsExpired.code) {
          this.accessToken = undefined;

          throw new BaseError('Unired service makeRequest - Authorization token expired or not valid');
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const message: string =
          typeof data?.error?.message === 'string' ? String(data?.error?.message) : String(data?.error?.message.en);

        this.loggerService.error(
          this.constructor.name,
          'Unired Service - makeRequest' + JSON.stringify(params, undefined, 4) + JSON.stringify(data, undefined, 4),
        );
        // we need to refactiring the errors
        switch (Number(errorCode)) {
          case UniredErrors.OptNotFound.code:

          case UniredErrors.SmsIsWrong.code:

          case UniredErrors.SmsIsWrong2.code: {
            throw new PaymentProcessingException(PaymentErrorCode.SmsIsWrong);
          }

          // eslint-disable-next-line no-fallthrough
          case UniredErrors.CardIsNotFound.code: {
            throw new PaymentProcessingException(PaymentErrorCode.CardNotFound);
          }

          case UniredErrors.CardIsNotFound2.code: {
            throw new PaymentProcessingException(PaymentErrorCode.CardNotFound);
          }

          case UniredErrors.CardIsNotFound3.code: {
            throw new PaymentProcessingException(PaymentErrorCode.CardNotFound);
          }

          case UniredErrors.CardIsNotFound4.code: {
            throw new PaymentProcessingException(PaymentErrorCode.CardNotFound);
          }

          case UniredErrors.ExternalIDExists.code: {
            throw new PaymentProcessingException(PaymentErrorCode.Reorder);
          }

          case UniredErrors.NotEnoughMoney.code:

          case UniredErrors.NotEnoughMoney2.code: {
            throw new PaymentProcessingException(PaymentErrorCode.MoneyNotEnough);
          }

          case UniredErrors.WrongCard.code: {
            throw PaymentErrorMessages[PaymentErrorCode.CardExpireDateIsWrong];
          }

          case UniredErrors.CardLimitSmsSend.code: {
            throw new PaymentProcessingException(PaymentErrorCode.CardLimitSmsCode);
          }

          default: {
            throw new PaymentProcessingException(PaymentErrorCode.UniredError, { message });
          }
        }
      }

      return data;
    } catch (error) {
      this.loggerService.error(this.constructor.name, 'Unired Service - makeRequest' + error.toString());

      if (error instanceof PaymentProcessingException) {
        throw error;
      }

      throw new PaymentProcessingException(PaymentErrorCode.UniredError);
    }
  }

  private async confirmPay(extId: string, code: string) {
    const confirmPaymentRequest = this.getPayload<ConfirmPaymentRequest>(UniredMethods.CREATE_PAYMENT_VERIFY, {
      ext_id: String(extId),
      code: String(code),
    });

    //@ToDo add validation
    const confirmResponse: ResponseData<ConfirmPaymentResponse> = await this.makeRequest<
      ConfirmPaymentRequest,
      ConfirmPaymentResponse
    >(confirmPaymentRequest);

    if (confirmResponse.error) {
      throw new BaseError(String(confirmResponse.error.message));
    }

    const result = confirmResponse.result;

    if (!result) {
      throw new BaseError('confirmPay - result is empty');
    }

    return confirmResponse;
  }

  async createPayment(orderId: number, amountSum: number, card: ICreditCardEntity): Promise<ITransaction> {
    try {
      let amountTiyin = amountSum * 100; // convert to coins

      if (this.configService.isDev()) {
        amountTiyin = 1 * 100; // convert to coins
      }

      const paymentData = this.getPaymentDataByCardNumber(card);

      const [cardExpireMonth, cardExpireYear] = card.expire_date.trim().split('/');

      const createPaymentRequest = this.getPayload<CreatePaymentRequest>(UniredMethods.CREATE_PAYMENT_NEW, {
        ext_id: String(orderId),
        number: String(card.number.trim()),
        expire: String(`${cardExpireYear}${cardExpireMonth}`),
        receiver_id: String(orderId),
        amount: amountTiyin,
        ...paymentData,
      });

      //@ToDo add validation
      const createPaymentResponse = await this.makeRequest<CreatePaymentRequest, CreatePaymentResponse>(
        createPaymentRequest,
      );

      const result = createPaymentResponse.result;

      if (Number(result.state) !== 0) {
        throw new PaymentProcessingException(PaymentErrorCode.UniredError, {
          message: JSON.stringify(result),
        });
      }

      if (result.state !== UniredCreatePaymentStates.create) {
        throw new PaymentProcessingException(PaymentErrorCode.UniredError, {
          message: JSON.stringify(result),
        });
      }

      console.info('createPaymentResponse', createPaymentResponse);

      const extId = result.ext_id;

      if (!extId) {
        throw new PaymentProcessingException(PaymentErrorCode.UniredError, {
          message: 'ext_id is empty' + JSON.stringify(result),
        });
      }

      const newTransactionData: ITransaction = {
        paymentSystem: PaymentSystemEnum.UNIRED,
        transaction_id: String(extId),
        create_time: Date.now(),
        amountCents: amountTiyin,
        state: EnumTransactionStates.NEW,
        order_id: Number(orderId),
        ofdState: EnumTransactionOfdStates.NEW,
      };

      return newTransactionData;
    } catch (error) {
      this.loggerService.error('UniredProvider - createTransaction - ', error.toString());
      this.loggerService.error('UniredProvider - additionalData - ', error.toString());

      if (error instanceof PaymentProcessingException) {
        this.loggerService.error('UniredProvider - Unired Error - ', error?.additionalData?.message);

        throw error;
      }

      throw new PaymentProcessingException(PaymentErrorCode.UniredError);
    }
  }

  async sendSmsForRegistrationUzcard(
    cardNumber: string,
    cardExpireYear: string,
    cardExpireMonth: string,
  ): Promise<{
    success: boolean;
    extId?: string;
    phone: string;
    errors?: string[];
  }> {
    try {
      //@ToDo add validation
      const result = await this.makeRequest<
        CardRegisterRequest,
        {
          token: string;
          verified: false;
          ext_id: number;
          phoneMask: string;
        }
      >(
        this.getPayload<CardRegisterRequest>(UniredMethods.CARD_NEW_OTP, {
          number: String(cardNumber),
          expire: `${cardExpireYear}${cardExpireMonth}`,
        }),
      );

      return {
        success: true,
        extId: String(result?.result?.ext_id),
        phone: String(result?.result?.phoneMask),
      };
    } catch (error) {
      this.loggerService.error(this.constructor.name, error.toString());

      return {
        phone: undefined,
        success: false,
        errors: [error.toString()],
      };
    }
  }

  async addTerminal(terminalId: number) {}
}
