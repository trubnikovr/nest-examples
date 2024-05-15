import { ExceptionAbstract } from "../abstracts/exception.abstract";

export class ServiceUnavailableException extends ExceptionAbstract {
  name = 'ServiceUnavailableException';
  statusCode = 503;
}