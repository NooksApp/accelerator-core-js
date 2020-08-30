
export class StreamCollectionSummary {
  constructor(
    public camera: number,
    public screen: number
  ) { }

  total(): number {
    return this.camera + this.screen;
  }
}

export enum StreamType {
  Camera = 'camera',
  Screen = 'screen'
}