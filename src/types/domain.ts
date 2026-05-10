/* eslint-disable @typescript-eslint/no-unused-vars */
import { AppConfig } from './config';
import { DownloadEvent } from './events';
import {
  MediaKind,
  VideoQuality,
  AudioBitrate,
  BrowserName,
  SubtitleOptions,
  MetadataOptions,
  PlaylistOptions,
} from './common';

export type UrlType = 'video' | 'playlist' | 'short' | 'music' | 'unknown';

export interface ValidatedUrl {
  normalizedUrl: string;
  type: UrlType;
}

export interface AudioOptions {
  format: 'mp3';
  bitrate: AudioBitrate;
}

export interface DownloadProfile {
  url: string;
  mediaKind: MediaKind;
  outputDirectory: string;
  filenameTemplate: string;
  videoQuality?: VideoQuality;
  audioOptions?: AudioOptions;
  subtitleOptions: SubtitleOptions;
  metadataOptions: MetadataOptions;
  browserCookies?: BrowserName | null;
  playlist: PlaylistOptions;
  useDownloadArchive: boolean;
  archivePath?: string;
}

export interface VideoFormat {
  id: string;
  ext: string;
  height?: number;
  width?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesizeApprox?: number;
  note?: string;
}

export interface NormalizedFormat {
  displayLabel: string;
  height?: number;
  ext: string;
  hasAudio: boolean;
  hasVideo: boolean;
  estimatedSize?: string;
  formatSelector: string;
}

export interface Preset {
  id: string;
  label: string;
  description?: string;
  profile: Partial<DownloadProfile>;
}

export interface RuntimeCapabilities {
  ffmpegAvailable: boolean;
  browserCookiesSupported: boolean;
  subtitlesSupported: boolean;
}

export interface YtDlpInfo {
  id?: string;
  title?: string;
  duration?: number;
  webpageUrl: string;
  isPlaylist: boolean;
  entriesCount?: number;
  rawFormats?: VideoFormat[];
  subtitles?: Record<string, unknown>;
  automaticCaptions?: Record<string, unknown>;
}

export interface YtDlpInspection {
  info: YtDlpInfo;
  formats: NormalizedFormat[];
}

export interface DownloadSession {
  url?: ValidatedUrl;
  info?: YtDlpInfo;
  formats?: NormalizedFormat[];
  selectedPreset?: Preset;
  capabilities?: RuntimeCapabilities;
  profileDraft?: Partial<DownloadProfile>;
}

// Workflow interfaces
export interface DownloadWorkflowInput {
  url?: string;
  presetId?: string;
  interactive: boolean;
  dryRun?: boolean;
  json?: boolean;
  overrides?: Partial<DownloadProfile>;
}

export interface DownloadResult {
  success: boolean;
  outputPaths: string[];
  warnings: string[];
}

export interface DryRunResult {
  success: true;
  profile: DownloadProfile;
  args: string[];
  expectedOutputPath?: string;
  expectedOutputTemplate: string;
}

export interface DownloadWorkflow {
  run(input: DownloadWorkflowInput): Promise<DownloadResult | DryRunResult>;
}

export interface YtDlpService {
  getVersion(): Promise<string>;
  checkAvailable(): Promise<boolean>;
  inspect(url: string): Promise<YtDlpInspection>;
  normalizeFormats(info: YtDlpInfo): NormalizedFormat[];
  download(profile: DownloadProfile): AsyncIterable<DownloadEvent>;
}
