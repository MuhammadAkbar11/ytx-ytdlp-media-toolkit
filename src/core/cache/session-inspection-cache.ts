import { YtDlpInfo } from '../../types/domain';

export class SessionInspectionCache {
  private cache = new Map<string, YtDlpInfo>();

  private generateKey(url: string): string {
    return url;
  }

  get(url: string): YtDlpInfo | undefined {
    return this.cache.get(this.generateKey(url));
  }

  set(url: string, data: YtDlpInfo): void {
    this.cache.set(this.generateKey(url), data);
  }

  has(url: string): boolean {
    return this.cache.has(this.generateKey(url));
  }

  clear(): void {
    this.cache.clear();
  }
}
