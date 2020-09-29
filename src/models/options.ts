import { Credentials } from "../sdk-wrapper/models";
import { AnnotationOptions } from "./annotationOptions";
import { ArchivingOptions } from "./archivingOptions";
import { CommunicationOptions } from "./communicationOptions";
import { ScreenSharingOptions } from "./screenSharingOptions";
import { TextChatOptions } from "./textChatOptions";

export class Options {
  constructor(
    public credentials: Credentials,
    public controlsContainer?: String | Element,
    public packages?: [string],
    public streamContainers?: Function,
    public largeScale: boolean = false,
    public applicationName?: String,

    public annotation?: AnnotationOptions,
    public archiving?: ArchivingOptions,
    public communication?: CommunicationOptions,
    public textChat?: TextChatOptions,
    public screenSharing?: ScreenSharingOptions,
  ) { }
}