import OT from '@opentok/client';
import SDKError from './errors';
import {
  Credentials,
  StreamCollection,
  StreamType
} from "./models";

export default class State {

  protected publishers: StreamCollection<OT.Publisher>;
  protected subscribers: StreamCollection<OT.Subscriber>;
  protected streams: Record<string, OT.Stream>;
  protected streamMap: Record<string, string>;
  public connected: boolean;
  public session: OT.Session;

  constructor(public credentials: Credentials) {
    this.validateCredentials(credentials);
  }

  /**
  * Ensures that we have the required credentials
  * @param credentials Credentials for the OpenTok session/user
  */
  private validateCredentials(credentials: Credentials): void {
    const required = ['apiKey', 'sessionId', 'token'];
    required.forEach((credential) => {
      if (!credentials[credential]) {
        throw new SDKError(`${credential} is a required credential`, 'invalidParameters');
      }
    });
    this.credentials = credentials;
  };

  /**
   * Returns the count of current publishers and subscribers by type
   */
  pubSubCount() {
    return {
      publisher: this.publishers.getCount(),
      subscriber: this.subscribers.getCount()
    }
  }

  /**
   * Returns the current publishers and subscribers, along with a count of each
   */
  getPubSub() {
    return {
      publishers: this.publishers,
      subscribers: this.subscribers,
      meta: this.pubSubCount()
    };
  }

  /**
   * Adds a publisher
   * @param type Type of stream
   * @param publisher Published stream
   */
  addPublisher(type: StreamType, publisher: OT.Publisher): void {
    this.publishers.addStream(type, publisher);
    this.streamMap[publisher.stream.streamId] = publisher.id;
  }

  /**
   * Removes a publisher
   * @param type Type of stream
   * @param publisher Published stream
   */
  removePublisher(type, publisher: OT.Publisher): void {
    this.publishers.removeStream(type, publisher);
  }

  /**
   * Removes all publishers
   */
  removeAllPublishers(): void {
    this.publishers.reset();
  }

  /**
   * Adds subscriber
   * @param subscriber Subscriber to add
   */
  addSubscriber(subscriber: OT.Subscriber): void {
    this.subscribers.addStream(
      subscriber.stream.videoType as StreamType,
      subscriber);
    this.streamMap[subscriber.stream.streamId] = subscriber.id;
  }

  /**
   * Removes a subscriber
   * @param subscriber Subscriber to remove
   */
  removeSubscriber(subscriber: OT.Subscriber): void {
    this.subscribers.removeStream(
      subscriber.stream.videoType as StreamType,
      subscriber);
  }

  addStream(stream: OT.Stream) {
    this.streams[stream.streamId] = stream;
  }

  removeStream(stream: OT.Stream) {
    const type = stream.videoType;
    const subscriberId = this.streamMap[stream.streamId];
    delete this.streamMap[stream.streamId];
    delete this.streams[stream.streamId];
    this.removeSubscriber(this.subscribers[type][subscriberId]);
  }

  /**
   * Retrieves all streams
   */
  getStreams() {
    return this.streams;
  }

  /**
   * Reset publishers, and subscribers
   */
  reset() {
    this.publishers.reset();
    this.subscribers.reset();
    this.streamMap = {};
    this.streams = {};
  }

  all() {
    return Object.assign(
      this.streams,
      this.streamMap,
      this.connected,
      this.getPubSub()
    );
  }
}
