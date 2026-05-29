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
  outputPath: string;
  filenameTemplate: string;
  videoQuality?: VideoQuality;
  audioOptions?: AudioOptions;
  subtitleOptions: SubtitleOptions;
  metadataOptions: MetadataOptions;
  browserCookies?: BrowserName | null;
  playlist: PlaylistOptions;

  estimatedSize?: number;
  useAria2?: boolean;
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


