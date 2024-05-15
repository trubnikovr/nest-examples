import type { IPaymeParamRequestInterface } from '@interfaces/payments/payme.interface';

export interface IAgent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: (url: string, params: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: (url: string, params: IPaymeParamRequestInterface) => Promise<any>;
}
