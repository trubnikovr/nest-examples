export abstract class ExceptionAbstract extends Error {
  protected abstract statusCode: number
  abstract name: string
}