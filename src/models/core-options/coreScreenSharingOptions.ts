export class CoreScreenSharingOptions {
  constructor(
    public extensionID: string,
    public extensionPathFF: string,
    public annotation: boolean,
    public externalWindow: boolean,
    public dev: boolean,
    public screenProperties: unknown
  ) {}
}
