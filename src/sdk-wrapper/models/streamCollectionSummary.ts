
export class StreamCollectionSummary {
  constructor(
    public camera: number,
    public screen: number,
    public sip: number = 0
  ) { }

  total(): number {
    return this.camera + this.screen + this.sip;
  }
}

export enum StreamType {
  Camera = 'camera',
  Screen = 'screen',
  SIP = 'sip'
}