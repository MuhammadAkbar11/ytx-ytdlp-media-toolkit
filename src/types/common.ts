export type MediaKind = 'video' | 'audio';

export type VideoQuality = 2160 | 1440 | 1080 | 720 | 480 | 'best';

export type AudioBitrate = 320 | 256 | 192 | 128;

export type BrowserName = 'chrome' | 'firefox' | 'edge' | 'brave' | 'safari';

export type PlaylistMode = 'entire_playlist' | 'first_video' | 'selected_items';

export interface SubtitleOptions {
  mode: 'none' | 'english' | 'all';
  output: 'embed' | 'separate';
}

export interface MetadataOptions {
  embedThumbnail: boolean;
  embedMetadata: boolean;
  embedChapters: boolean;
}

export interface PlaylistOptions {
  mode: PlaylistMode;
  selectedItems?: string;
}
