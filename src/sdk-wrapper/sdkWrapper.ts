import OT from '@opentok/client';
import State from './state';
import SDKError from './errors';
import { Credentials } from './models';

export class OpenTokSDK {

  constructor(credentials: Credentials) {
    this.validateCredentials(credentials);
    State.session = OT.initSession(credentials.apiKey, credentials.sessionId);
  }

  /**
   * Determines if a connection object is my local connection
   * @param connection - An OpenTok connection object
   */
  isMe(connection: OT.Connection): boolean {
    return State.session &&
      State.session.connection.connectionId === connection.connectionId;
  }

  /**
   * Wrap OpenTok session events
   */
  setInternalListeners() {
    if (State.session) {
      /**
       * Wrap session events and update state when streams are created
       * or destroyed
       */
      State.session.on('streamCreated', ({ stream }) => State.addStream(stream));
      State.session.on('streamDestroyed', ({ stream }) => State.removeStream(stream));
      State.session.on('sessionConnected sessionReconnected', () => State.isConnected = true);
      State.session.on('sessionDisconnected', () => State.isConnected = false);
    }
  }

  /**
   * Register a callback for a specific event, pass an object
   * with event => callback key/values (or an array of objects)
   * to register callbacks for multiple events.
   * @param {String | Object | Array} [events] - The name of the events
   * @param [callback]
   * https://tokbox.com/developer/sdks/js/reference/Session.html#on
   */
  on(events: string | object | [object], callback: Function) {
    if (typeof events === 'string') {
      this.bindListeners(State.session, this,)
    }

    if (events.length === 1 && typeof args[0] === 'object') {
      bindListeners(this.session, this, args[0]);
    } else if (args.length === 2) {
      bindListener(this.session, this, args[0], args[1]);
    }
  }

  on(event: string, callback: Function) {

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
    State.credentials = credentials;
  };

  /**
   * Binds and sets a single event listener on the OpenTok session
   * @param event - The name of the event
   * @param callback
   */
  private bindListener = (target, context, event, callback) => {
    const paramsError = '\'on\' requires a string and a function to create an event listener.';
    if (typeof event !== 'string' || typeof callback !== 'function') {
      throw new SDKError(paramsError, 'invalidParameters');
    }
    target.on(event, callback.bind(context));
  };
}
