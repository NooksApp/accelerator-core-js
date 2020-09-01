export class AnnotationOptions {
  constructor(
    public item: any,
    public color: any,
    public onScreenCapture: Function,
    public absoluteParent: ParentOptions
  ) { }
}

export class ParentOptions {
  constructor(
    public publisher: string,
    public subscriber: string
  ) { }
}
