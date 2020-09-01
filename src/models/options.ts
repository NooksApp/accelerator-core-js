import { AnalyticsOptions } from "./analyticsOptions";
import { CoreOptions } from "./coreOptions";
import { StateOptions } from "./stateOptions";

export class Options {
  constructor(
    public analytics: AnalyticsOptions,
    public core: CoreOptions,
    public state: StateOptions
  ) { }
}