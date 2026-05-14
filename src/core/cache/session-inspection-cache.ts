import { YtDlpInfo } from '../../types/domain';

import { RuntimeContext } from '../runtime/runtime-context';

export class SessionInspectionCache {
  private cache = new Map<string, YtDlpInfo>();

  private generateKey(url: string, context?: RuntimeContext): string {
    return `${url}|browser:${context?.browserCookies || 'none'}`;
  }

  get(url: string, context?: RuntimeContext): YtDlpInfo | undefined {
    return this.cache.get(this.generateKey(url, context));
  }

  set(url: string, data: YtDlpInfo, context?: RuntimeContext): void {
    this.cache.set(this.generateKey(url, context), data);
  }

  has(url: string, context?: RuntimeContext): boolean {
    return this.cache.has(this.generateKey(url, context));
  }

  clear(): void {
    this.cache.clear();
  }
}
