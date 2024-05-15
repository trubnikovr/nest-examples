import { ExceptionAbstract } from "../abstracts/exception.abstract";

// ForbiddenException
export class ForbiddenException extends ExceptionAbstract {
  statusCode = 403
  name = 'ForbiddenException'
}