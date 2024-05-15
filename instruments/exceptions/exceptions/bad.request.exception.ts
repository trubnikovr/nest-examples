import { ExceptionAbstract } from "../abstracts/exception.abstract";

export class BadRequestException extends ExceptionAbstract {
  statusCode = 400
  name = 'ServiceUnavailableException'
}