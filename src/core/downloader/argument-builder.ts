import { DownloadProfile } from '../../types/domain';
import * as path from 'path';

export class ArgumentBuilder {
  /**
   * Builds an array of yt-dlp arguments based on the provided DownloadProfile.
   *
   * @param profile The validated download profile.
   * @returns An array of string arguments.
   */
  build(profile: DownloadProfile): string[] {
    const args: string[] = [];

    // 1. Format selection and extraction
    if (profile.mediaKind === 'video') {
      if (profile.videoQuality === 'best') {
        args.push('-f', 'bestvideo+bestaudio/best');
      } else if (typeof profile.videoQuality === 'number') {
        args.push(
          '-f',
          `bestvideo[height<=${profile.videoQuality}]+bestaudio/best`
        );
      }
      args.push('--merge-output-format', 'mp4');
    } else if (profile.mediaKind === 'audio') {
      args.push('--extract-audio');

      const audioFormat = profile.audioOptions?.format || 'mp3';
      args.push('--audio-format', audioFormat);

      if (profile.audioOptions?.bitrate) {
        args.push('--audio-quality', `${profile.audioOptions.bitrate}k`);
      }
    }

    // 2. Subtitles
    if (profile.subtitleOptions && profile.subtitleOptions.mode !== 'none') {
      args.push('--write-subs');
      if (profile.subtitleOptions.mode === 'english') {
        args.push('--sub-langs', 'en');
      } else if (profile.subtitleOptions.mode === 'all') {
        args.push('--sub-langs', 'all');
      }

      if (profile.subtitleOptions.output === 'embed') {
        args.push('--embed-subs');
      }
    }

    // 3. Metadata Embedding
    if (profile.metadataOptions) {
      if (profile.metadataOptions.embedMetadata) {
        args.push('--embed-metadata');
      }
      if (profile.metadataOptions.embedThumbnail) {
        args.push('--embed-thumbnail');
      }
      if (profile.metadataOptions.embedChapters) {
        args.push('--embed-chapters');
      }
    }

    // 4. Playlist Handling
    if (profile.playlist) {
      if (profile.playlist.mode === 'entire_playlist') {
        args.push('--yes-playlist');
      } else if (profile.playlist.mode === 'first_video') {
        args.push('--no-playlist');
      } else if (profile.playlist.mode === 'selected_items') {
        args.push('--playlist-items', profile.playlist.selectedItems || '1');
      }
    }

    // 5. Archive
    if (profile.useDownloadArchive) {
      args.push('--download-archive', profile.archivePath || 'download-archive.txt');
    }

    // 5.5 Browser Cookies
    if (profile.browserCookies) {
      args.push('--cookies-from-browser', profile.browserCookies);
    }

    // 5.6 External Downloader
    if (profile.useAria2) {
      args.push('--downloader', 'aria2c');
    }

    // 6. Output Template
    if (profile.outputDirectory && profile.filenameTemplate) {
      const template = path.join(
        profile.outputDirectory,
        profile.filenameTemplate
      );
      args.push('-o', template);
    } else if (profile.filenameTemplate) {
      args.push('-o', profile.filenameTemplate);
    }

    // 7. URL (Always at the end)
    args.push(profile.url);

    return args;
  }
}
