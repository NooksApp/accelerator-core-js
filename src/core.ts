import { AnnotationOptions, Options, Packages } from './models';
import { dom, path, pathOr, properCase } from './util'
import { message, Analytics, LogAction, LogVariation } from './logging';
import { events } from './events';
import Communication from './communication';
import OpenTokSDK from './sdk-wrapper/sdkWrapper';
import CoreError from './errors';
import { Credentials, StreamType } from './sdk-wrapper/models';

class AccCore {

  // OpenTok SDK Wrapper
  private OpenTokSDK: OpenTokSDK;
  private analytics: Analytics;
  private annotation: Annotation;
  private archiving: Archiving;
  private communication: Communication;
  private screenSharing: ScreenSharing;
  private textChat: TextChat;

  private eventListeners: Object = {};

  constructor(options: Options) {

    // Options/credentials validation
    if (!options) {
      throw new CoreError('Missing options required for initialization', 'invalidParameters');
    }

    const sessionProps = options.largeScale ? { connectionEventsSuppressed: true } : undefined;
    this.OpenTokSDK = new OpenTokSDK(options.credentials, sessionProps);
    this.OpenTokSDK.setOptions(options);

    const credentials = options.credentials;

    // Init analytics
    this.analytics = new Analytics(window.location.origin, credentials.sessionId, null, credentials.apiKey, options.applicationName);
    this.analytics.log(LogAction.Init, LogVariation.Attempt);

    // Create internal event listeners
    const session = this.OpenTokSDK.getSession();
    this.createEventListeners(session, options);

    this.analytics.log(LogAction.Init, LogVariation.Success);
  }


  /**
   * Get access to an accelerator pack
   * @param packageName textChat, screenSharing, annotation, or archiving
   * @returns The instance of the accelerator pack
   */
  getAccPack = (packageName: string): Object => {
    this.analytics.log(LogAction.GetAccPack, LogVariation.Attempt);
    const packages = {
      textChat: this.textChat,
      screenSharing: this.screenSharing,
      annotation: this.annotation,
      archiving: this.archiving,
    };
    this.analytics.log(LogAction.GetAccPack, LogVariation.Success);
    return packages[packageName];
  }

  /** Eventing */

  /**
   * Register events that can be listened to be other components/modules
   * @param events A list of event names. A single event may
   * also be passed as a string.
   */
  registerEvents = (events: [] | String) => {
    const { eventListeners } = this;
    const eventList = Array.isArray(events) ? events : [events];
    eventList.forEach((event) => {
      if (!eventListeners[event]) {
        eventListeners[event] = new Set();
      }
    });
  };

  /**
   * Register a callback for a specific event or pass an object with
   * with event => callback key/value pairs to register listeners for
   * multiple events.
   * @param event The name of the event
   * @param callback
   */
  on = (event: String | Object, callback: Function) => {
    const { eventListeners, on } = this;
    if (typeof event === 'object') {
      Object.keys(event).forEach((eventName) => {
        on(eventName, event[eventName]);
      });
      return;
    }
    const eventCallbacks = eventListeners[event];
    if (!eventCallbacks) {
      message(`${event} is not a registered event.`);
    } else {
      eventCallbacks.add(callback);
    }
  }

  /**
   * Remove a callback for a specific event.  If no parameters are passed,
   * all event listeners will be removed.
   * @param event The name of the event
   * @param callback
   */
  off = (event: String, callback: Function) => {
    const { eventListeners } = this;
    // analytics.log(LogAction.off, LogVariation.attempt);
    if (!event && !callback) {
      Object.keys(eventListeners).forEach((eventType) => {
        eventListeners[eventType].clear();
      });
    } else {
      const eventCallbacks = eventListeners[event];
      if (!eventCallbacks) {
        // analytics.log(LogAction.off, LogVariation.fail);
        message(`${event} is not a registered event.`);
      } else {
        eventCallbacks.delete(callback);
        // analytics.log(LogAction.off, LogVariation.success);
      }
    }
  }

  /**
   * Trigger an event and fire all registered callbacks
   * @param event The name of the event
   * @param data Data to be passed to callback functions
   */
  triggerEvent = (event: string, data: any) => {
    const { eventListeners, registerEvents } = this;
    const eventCallbacks = eventListeners[event];
    if (!eventCallbacks) {
      registerEvents(event);
      message(`${event} has been registered as a new event.`);
    } else {
      eventCallbacks.forEach(callback => callback(data, event));
    }
  };

  /**
   * Get the current OpenTok session object
   */
  getSession = (): OT.Session => this.OpenTokSDK.getSession();


  /**
   * Returns the current OpenTok session credentials
   */
  getCredentials = (): Credentials => this.OpenTokSDK.getCredentials();

  /**
   * Returns the options used for initialization
   */
  getOptions = (): any => this.OpenTokSDK.getOptions()

  createEventListeners = (session: OT.Session, options: Options) => {
    this.eventListeners = {};
    Object.keys(events).forEach(type => this.registerEvents(events[type]));

    /**
     * If using screen sharing + annotation in an external window, the screen sharing
     * package will take care of calling annotation.start() and annotation.linkCanvas()
     */
    const usingAnnotation = options.screenSharing && options.screenSharing.annotation;
    const internalAnnotation = usingAnnotation && !options.screenSharing.externalWindow;

    /**
     * Wrap session events and update this.OpenTokSDK when streams are created
     * or destroyed
     */
    events.session.forEach((eventName) => {
      session.on(eventName, (event: OT.Event<string, any>) => {
        if (eventName === 'streamCreated') { this.OpenTokSDK.addStream(event.stream); }
        if (eventName === 'streamDestroyed') { this.OpenTokSDK.removeStream(event.stream); }
        this.triggerEvent(eventName, event);
      });
    });

    if (usingAnnotation) {
      this.on('subscribeToScreen', ({ subscriber }) => {
        this.annotation.start(this.getSession())
          .then(() => {
            const absoluteParent = dom.query(options.annotation.absoluteParent.subscriber);
            const linkOptions = absoluteParent ? { absoluteParent } : null;
            this.annotation.linkCanvas(subscriber, subscriber.element.parentElement, linkOptions);
          });
      });

      this.on('unsubscribeFromScreen', () => {
        this.annotation.end();
      });
    }

    this.on('startScreenSharing', (publisher) => {
      this.OpenTokSDK.addPublisher(StreamType.Screen, publisher);
      this.triggerEvent('startScreenShare', Object.assign({}, { publisher }, this.OpenTokSDK.getPubSub()));
      if (internalAnnotation) {
        this.annotation.start(this.getSession())
          .then(() => {
            const absoluteParent = dom.query(options.annotation.absoluteParent.publisher);
            const linkOptions = absoluteParent ? { absoluteParent } : null;
            this.annotation.linkCanvas(publisher, publisher.element.parentElement, linkOptions);
          });
      }
    });

    this.on('endScreenSharing', (publisher) => {
      // delete publishers.screen[publisher.id];
      this.OpenTokSDK.removePublisher('screen', publisher);
      this.triggerEvent('endScreenShare', this.OpenTokSDK.getPubSub());
      if (usingAnnotation) {
        this.annotation.end();
      }
    });
  }

  setupExternalAnnotation = () => this.annotation.start(this.getSession(), { screensharing: true })

  linkAnnotation = (pubSub, annotationContainer, externalWindow) => {
    this.annotation.linkCanvas(pubSub, annotationContainer, {
      externalWindow,
    });

    if (externalWindow) {
      // Add subscribers to the external window
      const streams = this.OpenTokSDK.getStreams();
      const cameraStreams = Object.keys(streams).reduce((acc, streamId) => {
        const stream = streams[streamId];
        return stream.videoType === 'camera' || stream.videoType === 'sip' ? acc.concat(stream) : acc;
      }, []);
      cameraStreams.forEach(this.annotation.addSubscriberToExternalWindow);
    }
  }

  initPackages = () => {
    this.analytics.log(LogAction.InitPackages, LogVariation.Attempt);
    const session = this.OpenTokSDK.getSession();
    const options = this.OpenTokSDK.getOptions();

    /**
     * Try to require a package.  If 'require' is unavailable, look for
     * the package in global scope.  A switch statement is used because
     * webpack and Browserify aren't able to resolve require statements
     * that use variable names.
     * @param packageName - The name of the npm package
     * @param globalName - The name of the package if exposed on global/window
     */
    const optionalRequire = (packageName: String, globalName: string): Object => {
      let result;
      /* eslint-disable global-require, import/no-extraneous-dependencies, import/no-unresolved */
      try {
        switch (packageName) {
          case 'opentok-text-chat':
            result = require('opentok-text-chat');
            break;
          case 'opentok-screen-sharing':
            result = require('opentok-screen-sharing');
            break;
          case 'opentok-annotation':
            result = require('opentok-annotation');
            break;
          case 'opentok-archiving':
            result = require('opentok-archiving');
            break;
          default:
            break;
        }
        /* eslint-enable global-require */
      } catch (error) {
        result = window[globalName];
      }
      if (!result) {
        this.analytics.log(LogAction.InitPackages, LogVariation.Fail);
        throw new CoreError(`Could not load ${packageName}`, 'missingDependency');
      }
      return result;
    };

    const packages: Packages = {};

    (options.packages || []).forEach((acceleratorPack) => {
      let package;
      switch (acceleratorPack) {
        case 'textChat':
          package = optionalRequire('opentok-text-chat', 'TextChatAccPack');
          break;
        case 'screenSharing':
          package = optionalRequire('opentok-screen-sharing', 'ScreenSharingAccPack');
          break;
        case 'annotation':
          package = optionalRequire('opentok-annotation', 'AnnotationAccPack');
          break;
        case 'archiving':
          package = optionalRequire('opentok-archiving', 'ArchivingAccPack');
          break;
      }

      if (!package) {
        message(`${acceleratorPack} is not a valid accelerator pack`);
      } else {
        packages[properCase(acceleratorPack)] = package;
      }
    });

    /**
     * Get containers for streams, controls, and the chat widget
     */
    const getDefaultContainer = pubSub => document.getElementById(`${pubSub}Container`);
    const getContainerElements = () => {
      // Need to use path to check for null values
      const controls = pathOr('#videoControls', 'controlsContainer', options);
      const chat = pathOr('#chat', 'textChat.container', options);
      const stream = pathOr(getDefaultContainer, 'streamContainers', options);
      return { stream, controls, chat };
    };

    /**
     * Return options for the specified package
     * @param packageName
     */
    const packageOptions = (packageName: String): Object => {
      /**
       * Methods to expose to accelerator packs
       */
      const accPack = {
        registerEventListener: this.on, // Legacy option
        on: this.on,
        registerEvents: this.registerEvents,
        triggerEvent: this.triggerEvent,
        setupExternalAnnotation: this.setupExternalAnnotation,
        linkAnnotation: this.linkAnnotation,
      };

      /**
       * If options.controlsContainer/containers.controls is null,
       * accelerator packs should not append their controls.
       */
      const containers = getContainerElements();
      const appendControl = !!containers.controls;
      const controlsContainer = containers.controls; // Legacy option
      const streamContainers = containers.stream;
      const baseOptions = {
        session,
        core: accPack,
        accPack,
        controlsContainer,
        appendControl,
        streamContainers,
      };

      switch (packageName) {
        /* beautify ignore:start */
        case 'communication': {
          return Object.assign({},
            baseOptions,
            {
              state: this.OpenTokSDK,
              analytics: this.analytics
            },
            {
              communication: options.communication
            });
        }
        case 'textChat': {
          const textChatOptions = {
            textChatContainer: options.textChat.container,
            waitingMessage: options.textChat.waitingMessage,
            sender: { alias: options.textChat.name },
            alwaysOpen: options.textChat.alwaysOpen
          };
          return Object.assign({}, baseOptions, textChatOptions);
        }
        case 'screenSharing': {
          const screenSharingContainer = { screenSharingContainer: streamContainers };
          return Object.assign({}, baseOptions, screenSharingContainer, options.screenSharing);
        }
        case 'annotation': {
          return Object.assign({}, baseOptions, options.annotation);
        }
        case 'archiving': {
          return Object.assign({}, baseOptions, options.archiving);
        }
        default:
          return {};
        /* beautify ignore:end */
      }
    };

    /** Create instances of each package */
    // eslint-disable-next-line global-require,import/no-extraneous-dependencies

    this.communication = new Communication(packageOptions('communication'));
    this.textChat = packages.TextChat ? new packages.TextChat(packageOptions('textChat')) : null;
    this.screenSharing = packages.ScreenSharing ? new packages.ScreenSharing(packageOptions('screenSharing')) : null;
    this.annotation = packages.Annotation ? new packages.Annotation(packageOptions('annotation')) : null;
    this.archiving = packages.Archiving ? new packages.Archiving(packageOptions('archiving')) : null;

    this.analytics.log(LogAction.InitPackages, LogVariation.Success);
  }

  /**
   * Connect to the session
   */
  connect = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.analytics.log(LogAction.Connect, LogVariation.Attempt);
      const session = this.getSession();
      const { apiKey, token } = this.getCredentials();
      session.connect(token, (error) => {
        if (error) {
          message(error);
          this.analytics.log(LogAction.Connect, LogVariation.Fail);
          return reject(error);
        }
        const { sessionId } = session;
        this.analytics.update(sessionId, session.connection.connectionId, apiKey);
        this.analytics.log(LogAction.Connect, LogVariation.Success);
        this.initPackages();
        this.triggerEvent('connected', session);
        return resolve();
      });
    });
  }

  /**
   * Disconnect from the session
   */
  disconnect = (): void => {
    this.analytics.log(LogAction.Disconnect, LogVariation.Attempt);
    this.getSession().disconnect();
    this.OpenTokSDK.reset();
    this.analytics.log(LogAction.Disconnect, LogVariation.Success);
  };

  /**
   * Force a remote connection to leave the session
   * @param connection
   */
  forceDisconnect = (connection: OT.Connection): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.analytics.log(LogAction.ForceDisconnect, LogVariation.Attempt);
      this.getSession().forceDisconnect(connection, (error) => {
        if (error) {
          this.analytics.log(LogAction.ForceDisconnect, LogVariation.Fail);
          reject(error);
        } else {
          this.analytics.log(LogAction.ForceDisconnect, LogVariation.Success);
          resolve();
        }
      });
    });
  }

  // *********************************************
  // MIKE: HERE IS WHERE YOU ARE!!!!
  // *********************************************


  /**
   * Start publishing video and subscribing to streams
   * @param {Object} publisherProps - https://goo.gl/0mL0Eo
   * @returns {Promise} <resolve: State + Publisher, reject: Error>
   */
  startCall = publisherProps => this.communication.startCall(publisherProps)

  /**
   * Stop all publishing un unsubscribe from all streams
   * @returns {void}
   */
  endCall = () => this.communication.endCall()

  /**
   * Start publishing video and subscribing to streams
   * @returns {Object} The internal state of the core session
   */
  state = () => this.this.OpenTokSDK.all();

  /**
   * Manually subscribe to a stream
   * @param {Object} stream - An OpenTok stream
   * @param {Object} [subscriberProperties] - https://tokbox.com/developer/sdks/js/reference/Session.html#subscribe
   * @param {Boolean} [networkTest] - Subscribing to our own publisher as part of a network test?
   * @returns {Promise} <resolve: Subscriber, reject: Error>
   */
  subscribe = (stream, subscriberProperties, networkTest = false) =>
    this.communication.subscribe(stream, subscriberProperties, networkTest)

  /**
   * Manually unsubscribe from a stream
   * @param {Object} subscriber - An OpenTok subscriber object
   * @returns {Promise} <resolve: void, reject: Error>
   */
  unsubscribe = subscriber => this.communication.unsubscribe(subscriber)

  /**
   * Force the publisher of a stream to stop publishing the stream
   * @param {Object} stream
   * @returns {Promise} <resolve: empty, reject: Error>
   */
  forceUnpublish = (stream) => {
    const { analytics, getSession } = this;
    return new Promise((resolve, reject) => {
      analytics.log(LogAction.forceUnpublish, LogVariation.attempt);
      getSession().forceUnpublish(stream, (error) => {
        if (error) {
          analytics.log(LogAction.forceUnpublish, LogVariation.fail);
          reject(error);
        } else {
          analytics.log(LogAction.forceUnpublish, LogVariation.success);
          resolve();
        }
      });
    });
  }

  /**
   * Get the local publisher object for a stream
   * @param {Object} stream - An OpenTok stream object
   * @returns {Object} - The publisher object
   */
  getPublisherForStream = stream => this.getSession().getPublisherForStream(stream);

  /**
   * Get the local subscriber objects for a stream
   * @param {Object} stream - An OpenTok stream object
   * @returns {Array} - An array of subscriber object
   */
  getSubscribersForStream = stream => this.getSession().getSubscribersForStream(stream);


  /**
   * Send a signal using the OpenTok signaling apiKey
   * @param {String} type
   * @param {*} [data]
   * @param {Object} [to] - An OpenTok connection object
   * @returns {Promise} <resolve: empty, reject: Error>
   */
  signal = (type, data, to) => {
    const { analytics, getSession } = this;
    return new Promise((resolve, reject) => {
      analytics.log(LogAction.signal, LogVariation.attempt);
      const session = getSession();
      const signalObj = Object.assign({},
        type ? { type } : null,
        data ? { data: JSON.stringify(data) } : null,
        to ? { to } : null // eslint-disable-line comma-dangle
      );
      session.signal(signalObj, (error) => {
        if (error) {
          analytics.log(LogAction.signal, LogVariation.fail);
          reject(error);
        } else {
          analytics.log(LogAction.signal, LogVariation.success);
          resolve();
        }
      });
    });
  }

  /**
   * Enable or disable local audio
   * @param {Boolean} enable
   */
  toggleLocalAudio = (enable) => {
    const { analytics, this.OpenTokSDK, communication } = this;
    analytics.log(LogAction.toggleLocalAudio, LogVariation.attempt);
    const { publishers } = this.OpenTokSDK.getPubSub();
    const toggleAudio = id => communication.enableLocalAV(id, 'audio', enable);
    Object.keys(publishers.camera).forEach(toggleAudio);
    analytics.log(LogAction.toggleLocalAudio, LogVariation.success);
  };

  /**
   * Enable or disable local video
   * @param {Boolean} enable
   */
  toggleLocalVideo = (enable) => {
    const { analytics, this.OpenTokSDK, communication } = this;
    analytics.log(LogAction.toggleLocalVideo, LogVariation.attempt);
    const { publishers } = this.OpenTokSDK.getPubSub();
    const toggleVideo = id => communication.enableLocalAV(id, 'video', enable);
    Object.keys(publishers.camera).forEach(toggleVideo);
    analytics.log(LogAction.toggleLocalVideo, LogVariation.success);
  };

  /**
   * Enable or disable remote audio
   * @param {String} id - Subscriber id
   * @param {Boolean} enable
   */
  toggleRemoteAudio = (id, enable) => {
    const { analytics, communication } = this;
    analytics.log(LogAction.toggleRemoteAudio, LogVariation.attempt);
    communication.enableRemoteAV(id, 'audio', enable);
    analytics.log(LogAction.toggleRemoteAudio, LogVariation.success);
  };

  /**
   * Enable or disable remote video
   * @param {String} id - Subscriber id
   * @param {Boolean} enable
   */
  toggleRemoteVideo = (id, enable) => {
    const { analytics, communication } = this;
    analytics.log(LogAction.toggleRemoteVideo, LogVariation.attempt);
    communication.enableRemoteAV(id, 'video', enable);
    analytics.log(LogAction.toggleRemoteVideo, LogVariation.success);
  }

}

if (global === window) {
  window.AccCore = AccCore;
}

module.exports = AccCore;
