export class TextChatOptions {
  constructor(
    public _name: string,
    public waitingMessage: string,
    public container: string,
    public alwaysOpen: boolean
  ) { }
}