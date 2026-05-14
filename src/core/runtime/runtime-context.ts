import { BrowserName } from '../../types/common';

export interface RuntimeCapabilities {
  ytDlpAvailable: boolean;
  ffmpegAvailable: boolean;
  aria2Available: boolean;
}

export interface RuntimeContext {
  browserCookies?: BrowserName;
}

export interface PreparedRuntimeContext extends RuntimeContext {
  capabilities: RuntimeCapabilities;
}

export class RuntimeContextBuilder {
  private context: RuntimeContext = {};

  withBrowserCookies(browser?: BrowserName | null): this {
    if (browser) {
      this.context.browserCookies = browser;
    }
    return this;
  }

  build(): RuntimeContext {
    return this.context;
  }
}
