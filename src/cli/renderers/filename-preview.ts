import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { DownloadProfile } from '../../types/domain';
import { ArgumentBuilder } from '../../core/downloader/argument-builder';
import ora from 'ora';
import chalk from 'chalk';
import { runtimeEnvironment } from '../../core/runtime/runtime-environment';

export interface FilenamePreviewResult {
  filenames: string[];
  isError: boolean;
}

export class FilenamePreview {
  constructor(
    private processRunner: ProcessRunner,
    private argumentBuilder: ArgumentBuilder
  ) {}

  private isPlaylist(profile: DownloadProfile): boolean {
    return (
      !!profile.playlist &&
      (profile.playlist.mode === 'entire_playlist' ||
        profile.playlist.mode === 'selected_items')
    );
  }

  private fixExtension(filename: string, profile: DownloadProfile): string {
    if (profile.mediaKind === 'audio') {
      const audioFormat = profile.audioOptions?.format || 'mp3';
      return filename.replace(/\.[^/.]+$/, `.${audioFormat}`);
    } else if (profile.mediaKind === 'video') {
      return filename.replace(/\.[^/.]+$/, '.mp4');
    }
    return filename;
  }

  /**
   * Generates a preview of the filename(s) using yt-dlp --get-filename.
   *
   * @param profile The download profile.
   * @returns The generated filenames or an error message.
   */
  async generatePreview(profile: DownloadProfile): Promise<FilenamePreviewResult> {
    const args = this.argumentBuilder.build(profile);

    // Add --get-filename to get the output filename without downloading
    args.push('--get-filename');

    try {
      const result = await this.processRunner.run('yt-dlp', args, {
        bufferStderr: false,
      });
      if (result.exitCode === 0) {
        const lines = result.stdout
          .trim()
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        const filenames = lines.map((f) => this.fixExtension(f, profile));
        return { filenames, isError: false };
      } else {
        return {
          filenames: [`Error: Could not predict filename (exit code ${result.exitCode})`],
          isError: true,
        };
      }
    } catch {
      return {
        filenames: ['Error: Could not predict filename'],
        isError: true,
      };
    }
  }

  /**
   * Renders the preview to the console.
   *
   * @param profile The download profile.
   * @returns The preview result with filenames.
   */
  async render(profile: DownloadProfile): Promise<FilenamePreviewResult> {
    console.log(`  `);
    const spinner = runtimeEnvironment.isInteractive
      ? ora('Generating filename preview...').start()
      : null;
    const result = await this.generatePreview(profile);
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

    if (result.isError) {
      console.log(`${symbol} Predicted Output: ${result.filenames[0]}\n`);
    } else if (result.filenames.length === 1) {
      console.log(`${symbol} Predicted Output: ${result.filenames[0]}\n`);
    } else {
      console.log(`${symbol} Predicted Output (${result.filenames.length} files):`);
      for (let i = 0; i < result.filenames.length; i++) {
        console.log(`  ${chalk.dim(`${i + 1}.`)} ${result.filenames[i]}`);
      }
      console.log('');
    }

    return result;
  }
}
