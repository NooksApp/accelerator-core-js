/**
 * Defines errors emitted from the SDK
 */
export default class SDKError extends Error {
  constructor(errorMessage: string, errorName: string, stack?: string) {
    super(`otSDK: ${errorMessage}`);
    this.name = errorName;
    this.stack = stack;
  }
}
