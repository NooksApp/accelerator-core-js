import OT from '@opentok/client';
import {
  Credentials,
  StreamCollection,
  StreamType
} from "./models";

export default abstract class State {

  private static publishers: StreamCollection<OT.Publisher>;
  private static subscribers: StreamCollection<OT.Subscriber>;
  private static streams: Record<string, OT.Stream>;
  private static streamMap: Record<string, string>;
  public static isConnected: boolean;
  public static session: OT.Session;
  public static credentials: Credentials;

  /**
   * Returns the count of current publishers and subscribers by type
   */
  static pubSubCount() {
    return {
      publisher: this.publishers.getCount(),
      subscriber: this.subscribers.getCount()
    }
  }

  /**
   * Returns the current publishers and subscribers, along with a count of each
   */
  static getPubSub() {
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
  static addPublisher(type: StreamType, publisher: OT.Publisher): void {
    this.publishers.addStream(type, publisher)
  }

  /**
   * Removes a publisher
   * @param type Type of stream
   * @param publisher Published stream
   */
  static removePublisher(type, publisher: OT.Publisher): void {
    this.publishers.removeStream(type, publisher);
  }

  /**
   * Removes all publishers
   */
  static removeAllPublishers(): void {
    this.publishers.reset();
  }

  /**
   * Adds subscriber
   * @param subscriber Subscriber to add
   */
  static addSubscriber(subscriber: OT.Subscriber): void {
    this.subscribers.addStream(
      subscriber.stream.videoType as StreamType,
      subscriber);
    this.streamMap[subscriber.stream.streamId] = subscriber.id;
  }

  /**
   * Removes a subscriber
   * @param subscriber Subscriber to remove
   */
  static removeSubscriber(subscriber: OT.Subscriber): void {
    this.subscribers.removeStream(
      subscriber.stream.videoType as StreamType,
      subscriber);
  }

  static addStream(stream: OT.Stream) {
    this.streams[stream.streamId] = stream;
  }

  static removeStream(stream: OT.Stream) {
    const type = stream.videoType;
    const subscriberId = this.streamMap[stream.streamId];
    delete this.streamMap[stream.streamId];
    delete this.streams[stream.streamId];
    this.removeSubscriber(this.subscribers[type][subscriberId]);
  }

  /**
   * Retrieves all streams
   */
  static getStreams() {
    return this.streams;
  }

  /**
   * Reset publishers, and subscribers
   */
  static reset() {
    this.publishers.reset();
    this.subscribers.reset();
    this.streamMap = {};
    this.streams = {};
  }
}
