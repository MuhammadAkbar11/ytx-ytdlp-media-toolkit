import { BrowserName, AudioBitrate, SubtitleOptions, MetadataOptions } from './common';

export interface AppConfig {
  version: number;
  outputDirectory: string;
  preferredBrowser: BrowserName | null;
  preferredBitrate: AudioBitrate;
  filenameTemplate: string;
  subtitleOptions: SubtitleOptions;
  metadataOptions: MetadataOptions;
  useDownloadArchive: boolean;
  defaultPreset: string;
}
