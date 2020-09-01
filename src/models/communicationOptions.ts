export class CommunicationOptions {
  constructor(
    public autoSubscribe: boolean,
    public subscribeOnly: boolean,
    public connectionLimit: number,
    public callProperties: any
  ) { }
}

class widget {
  color: String;
}