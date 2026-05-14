import { BrowserName } from '../../types/common';

export interface RuntimeContext {
  browserCookies?: BrowserName;
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
