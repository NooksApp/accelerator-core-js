import OTKAnalytics from 'opentok-solutions-logging';

// eslint-disable-next-line no-console
export const message = messageText => console.log(`otAccCore = ${messageText}`);

export enum LogVariation {
  Attempt = "attempt",
  Success = "success",
  Fail = "fail"
}

export enum LogAction {
  // vars for the analytics logs. Internal use
  Init = 'init',
  InitPackages = 'initPackages',
  Connect = 'connectCoreAcc',
  Disconnect = 'disconnectCoreAcc',
  ForceDisconnect = 'forceDisconnectCoreAcc',
  ForceUnpublish = 'forceUnpublishCoreAcc',
  GetAccPack = 'getAccPack',
  Signal = 'signalCoreAcc',
  StartCall = 'startCallCoreAcc',
  EndCall = 'endCallCoreAcc',
  ToggleLocalAudio = 'toggleLocalAudio',
  ToggleLocalVideo = 'toggleLocalVideo',
  ToggleRemoteAudio = 'toggleRemoteAudio',
  ToggleRemoteVideo = 'toggleRemoteVideo',
  Subscribe = 'subscribeCoreAcc',
  Unsubscribe = 'unsubscribeCoreAcc',
};

export class Analytics {

  analytics: OTKAnalytics;

  /**
   * @param source 
   * @param sessionId Unique identifier for the session
   * @param connectionId Unique identifier for the connection
   * @param apiKey OpenTok API key for the project
   * @param applicationName Name of the OpenTok application
   */
  constructor(
    source: string,
    sessionId: string,
    connectionId: string,
    apikey: string,
    applicationName: string = 'coreAccelerator'
  ) {
    const otkanalyticsData = {
      clientVersion: 'js-vsol-x.y.z', // x.y.z filled by npm build script
      source,
      componentId: 'acceleratorCore',
      name: applicationName,
      partnerId: apikey,
    };

    this.analytics = new OTKAnalytics(otkanalyticsData);

    if (connectionId) {
      this.update(sessionId, connectionId, apikey);
    }
  }

  /**
   * 
   * @param sessionId Unique identifier for the session
   * @param connectionId Unique identifier for the connection
   * @param apiKey OpenTok API key for the project
   */
  update(sessionId: string, connectionId: string, apiKey: string): void {
    if (sessionId && connectionId && apiKey) {
      const sessionInfo = {
        sessionId,
        connectionId,
        partnerId: apiKey,
      };
      this.analytics.addSessionInfo(sessionInfo);
    }
  };

  /**
   * 
   * @param action 
   * @param variation 
   */
  log(action: string, variation: string) {
    this.analytics.logEvent({ action, variation });
  };
}