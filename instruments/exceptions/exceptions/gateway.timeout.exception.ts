import { ExceptionAbstract } from "../abstracts/exception.abstract";

// GatewayTimeoutException
export class GatewayTimeoutException extends ExceptionAbstract {
  name = 'GatewayTimeoutException';
  statusCode = 504;
}