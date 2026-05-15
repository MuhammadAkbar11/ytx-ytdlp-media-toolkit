import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { DownloadProfile } from '../../types/domain';
import { ArgumentBuilder } from '../../core/downloader/argument-builder';
import ora from 'ora';

export class FilenamePreview {
  constructor(
    private processRunner: ProcessRunner,
    private argumentBuilder: ArgumentBuilder
  ) {}

  /**
   * Generates a preview of the filename using yt-dlp --get-filename.
   *
   * @param profile The download profile.
   * @returns The generated filename or an error message.
   */
  async generatePreview(profile: DownloadProfile): Promise<string> {
    const args = this.argumentBuilder.build(profile);

    // Add --get-filename to get the output filename without downloading
    args.push('--get-filename');

    try {
      const result = await this.processRunner.run('yt-dlp', args);
      if (result.exitCode === 0) {
        let filename = result.stdout.trim();

        // Fix extension in preview because yt-dlp --get-filename returns the raw stream extension
        if (profile.mediaKind === 'audio') {
          const audioFormat = profile.audioOptions?.format || 'mp3';
          filename = filename.replace(/\.[^/.]+$/, `.${audioFormat}`);
        } else if (profile.mediaKind === 'video') {
          filename = filename.replace(/\.[^/.]+$/, '.mp4');
        }

        return filename;
      } else {
        return `Error: yt-dlp failed with exit code ${result.exitCode}`;
      }
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  /**
   * Renders the preview to the console.
   *
   * @param profile The download profile.
   * @returns The generated filename.
   */
  async render(profile: DownloadProfile): Promise<string> {
    const spinner = ora('Generating filename preview...').start();
    const filename = await this.generatePreview(profile);
    spinner.stop();

    console.log('\nPreview Results:');
    console.log(`➤ Download Directory: ${profile.outputDirectory}`);
    console.log(`➤ Filename Template: ${profile.filenameTemplate}`);
    console.log(`➤ Predicted Output: ${filename}`);

    return filename;
  }
}
