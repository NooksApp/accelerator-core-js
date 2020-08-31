/**
 * Errors 
 */
export default class CoreError extends Error {
  constructor(
    public errorMessage: string,
    public errorName: string,
    public stack?: string
  ) {
    super(`otAccCore: ${errorMessage}`);
    this.name = errorName;
    this.stack = stack;
  }
}

