import {
  BrowserName,
  AudioBitrate,
  SubtitleOptions,
  MetadataOptions,
  VideoQuality,
} from './common';

export interface AppConfig {
  preferredVideoQuality: VideoQuality | undefined;
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
