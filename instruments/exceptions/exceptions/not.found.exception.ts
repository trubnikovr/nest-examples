import { ExceptionAbstract } from "../abstracts/exception.abstract";

export class NotFoundException extends ExceptionAbstract {
  name = 'NotFoundException';
  statusCode = 404;
}