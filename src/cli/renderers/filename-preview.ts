import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { DownloadProfile } from '../../types/domain';
import { ArgumentBuilder } from '../../core/downloader/argument-builder';
import ora from 'ora';
import chalk from 'chalk';
import { runtimeEnvironment } from '../../core/runtime/runtime-environment';

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
      const result = await this.processRunner.run('yt-dlp', args, {
        bufferStderr: false,
      });
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
    console.log(`  `);
    const spinner = runtimeEnvironment.isInteractive
      ? ora('Generating filename preview...').start()
      : null;
    const filename = await this.generatePreview(profile);
    if (spinner) {
      spinner.stopAndPersist({
        symbol: chalk.green('✔'),
        text: 'Filename preview generated',
      });
    } else {
      console.log(chalk.blue('➤ Generating filename preview...'));
    }

    const symbol = chalk.blue('➤');
    console.log(`${chalk.blue('❖')} Preview Results:`);
    console.log(`${symbol} Output Path: ${profile.outputPath}`);
    console.log(`${symbol} Filename Template: ${profile.filenameTemplate}`);
    console.log(`${symbol} Predicted Output: ${filename}\n`);

    return filename;
  }
}
