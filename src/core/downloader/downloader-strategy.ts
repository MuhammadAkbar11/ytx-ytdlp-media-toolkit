import { DownloadProfile } from '../../types/domain';

export interface DownloaderStrategy {
  getArgs(profile: DownloadProfile): string[];
}

export class DefaultDownloaderStrategy implements DownloaderStrategy {
  getArgs(_profile: DownloadProfile): string[] {
    return [];
  }
}

export class Aria2DownloaderStrategy implements DownloaderStrategy {
  getArgs(_profile: DownloadProfile): string[] {
    return ['--downloader', 'aria2c', '-N', '8'];
  }
}

export class DownloaderStrategyResolver {
  resolve(profile: DownloadProfile): DownloaderStrategy {
    if (profile.useAria2) {
      return new Aria2DownloaderStrategy();
    }
    return new DefaultDownloaderStrategy();
  }
}
