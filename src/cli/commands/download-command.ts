/* eslint-disable @typescript-eslint/no-explicit-any */
import { input, select } from '@inquirer/prompts';
import { InspectionService } from '../../core/downloader/inspection.service';
import { Mp4DownloadWorkflow } from '../../core/workflows/mp4-download-workflow';
import { Mp3DownloadWorkflow } from '../../core/workflows/mp3-download-workflow';
import { SubtitleWorkflow } from '../../core/workflows/subtitle-workflow';
import { FilenamePreview } from '../renderers/filename-preview';
import { DryRunWorkflow } from '../../core/workflows/dry-run-workflow';
import { EventStream } from '../../core/runtime/event-stream';
import { TerminalRenderer } from '../renderers/terminal-renderer';
import { validateUrl } from '../../core/validation/url-validator';
import { ProfileBuilder } from '../../core/profiles/profile-builder';
import { ConfigService } from '../../core/config/config.service';
import { PresetRegistry } from '../../core/presets/preset-registry';
import { DirectoryValidator } from '../../core/filesystem/directory-validator';
import { DebugRenderer } from '../renderers/debug-renderer';
import { ArtifactSizeEstimator } from '../../core/runtime/artifact-size-estimator';
import chalk from 'chalk';
import ora from 'ora';
import { gracefulShutdownManager } from '../../core/runtime/graceful-shutdown';
import {
  AudioBitrate,
  DownloadProfile,
  MediaKind,
  VideoQuality,
} from '../../types';

export interface DownloadOptions {
  dryRun?: boolean;
  preset?: string;
  audio?: boolean;
  video?: boolean;
  quality?: string;
  subLang?: string;
  subMode?: string;
  output?: string;
  verbose?: boolean;
  aria2?: boolean;
}

export class DownloadCommand {
  constructor(
    private inspectionService: InspectionService,
    private mp4Workflow: Mp4DownloadWorkflow,
    private mp3Workflow: Mp3DownloadWorkflow,
    private subtitleWorkflow: SubtitleWorkflow,
    private filenamePreview: FilenamePreview,
    private eventStream: EventStream,
    private profileBuilder: ProfileBuilder,
    private configService: ConfigService,
    private presetRegistry: PresetRegistry,
    private dryRunWorkflow: DryRunWorkflow,
    private directoryValidator: DirectoryValidator
  ) {}

  async execute(
    initialUrl?: string,
    options: DownloadOptions = {}
  ): Promise<void> {
    const renderer = new TerminalRenderer(this.eventStream);
    renderer.start();
    gracefulShutdownManager.registerCleanup(() => renderer.stop());

    let debugRenderer: any;
    if (options.verbose) {
      debugRenderer = new DebugRenderer(this.eventStream, {
        verbose: true,
        debug: false,
      });
      debugRenderer.start();
      gracefulShutdownManager.registerCleanup(() => debugRenderer.stop());
    }

    try {
      // 1. Prompt for URL if not provided
      let url = initialUrl;
      if (!url) {
        url = await input({
          message: 'Enter YouTube URL:',
          validate: (val) => validateUrl(val).ok || 'Invalid URL',
        });
      } else {
        const valRes = validateUrl(url);
        if (!valRes.ok) {
          console.log(chalk.red('✘ Invalid URL provided.'));
          return;
        }
      }

      // 2. Inspect the URL
      const spinner = ora('Inspecting URL...').start();
      const inspectRes = await this.inspectionService.inspect(url);
      spinner.stop();

      if (!inspectRes.ok) {
        console.log(
          chalk.red(`✘ Inspection failed: ${inspectRes.error.message}`)
        );
        return;
      }

      console.log(chalk.green(`✔ Found: ${inspectRes.value.title}`));

      const appConfig = this.configService.getAll();

      // 2.5 Playlist Prompt
      let globalOverrides: Partial<DownloadProfile> = {};
      if (options.aria2) {
        globalOverrides.useAria2 = true;
      }
      const valRes = validateUrl(url);
      if (valRes.ok && valRes.value.type === 'playlist') {
        const playlistMode = await select<
          'entire_playlist' | 'first_video' | 'selected_items'
        >({
          message: 'Playlist detected. How do you want to proceed?',
          choices: [
            { name: 'Download entire playlist', value: 'entire_playlist' },
            { name: 'Download first item only', value: 'first_video' },
            { name: 'Specify items (e.g. 1,3,5-10)', value: 'selected_items' },
          ],
        });

        let selectedItems: string | undefined;
        if (playlistMode === 'selected_items') {
          selectedItems = await input({
            message: 'Enter items to download (e.g. 1,3,5-10):',
            validate: (val) => val.trim().length > 0 || 'Cannot be empty',
          });
        }

        globalOverrides.playlist = {
          mode: playlistMode,
          selectedItems,
        };
      }

      // 2.6 Output Directory Prompt
      let outputDirectory = options.output;

      if (!outputDirectory) {
        const useDefaultDir = await select<'yes' | 'no'>({
          message: `Use default download directory? (${appConfig.outputDirectory})`,
          choices: [
            { name: 'Yes', value: 'yes' },
            { name: 'No', value: 'no' },
          ],
        });

        if (useDefaultDir === 'no') {
          let valid = false;
          while (!valid) {
            outputDirectory = await input({
              message: 'Enter custom output directory:',
              validate: (val) => val.trim().length > 0 || 'Cannot be empty',
            });
            const dirValRes =
              await this.directoryValidator.validate(outputDirectory);
            if (dirValRes.ok) {
              valid = true;
            } else {
              console.log(chalk.yellow(`\n⚠️ ${dirValRes.error.message}`));
            }
          }
        } else {
          outputDirectory = appConfig.outputDirectory;
        }
      } else {
        // Validate provided output directory
        const dirValRes =
          await this.directoryValidator.validate(outputDirectory);
        if (!dirValRes.ok) {
          console.log(
            chalk.red(
              `\n✘ Invalid output directory: ${dirValRes.error.message}`
            )
          );
          return;
        }
      }
      globalOverrides.outputDirectory = outputDirectory;

      // 3. Prompt for Preset or Custom
      const presets = this.presetRegistry.getAllPresets();
      const presetChoices = presets.map((p) => ({
        name: `${p.label} - ${p.description}`,
        value: p.id,
      }));

      presetChoices.unshift({
        name: 'Custom (Configure manually)',
        value: 'custom',
      });

      const selectedPresetId =
        options.preset ||
        (await select<string>({
          message: 'Select a download preset:',
          choices: presetChoices,
          default: appConfig.defaultPreset || 'custom',
        }));

      if (options.dryRun) {
        console.log(chalk.blue('ℹ Dry run enabled. Previewing execution...'));
        const dryRunRes = await this.dryRunWorkflow.run(
          url,
          appConfig,
          selectedPresetId
        );

        if (!dryRunRes.ok) {
          console.log(chalk.red('✖ Dry run failed:'));
          dryRunRes.error.forEach((issue) => {
            console.log(
              chalk.red(
                `  - [${issue.category}] ${issue.message} (${issue.field || 'general'})`
              )
            );
          });
          return;
        }

        const res = dryRunRes.value;
        console.log(
          chalk.green('\n✔ Dry Run Successful! Previewing resolved state:')
        );
        console.log(chalk.yellow('\n--- Resolved Profile ---'));
        console.log(JSON.stringify(res.profile, null, 2));

        console.log(chalk.yellow('\n--- Resolved Arguments ---'));
        console.log(chalk.cyan(`yt-dlp ${res.arguments.join(' ')}`));

        console.log(chalk.yellow('\n------------------------'));
        return;
      }

      let profile: DownloadProfile;

      if (selectedPresetId !== 'custom') {
        const preset = this.presetRegistry.getPreset(selectedPresetId);
        profile = this.profileBuilder.build(url, appConfig, preset);
        console.log(chalk.green(`✔ Using preset: ${preset?.label}`));
      } else {
        // Custom flow
        let mediaKind: MediaKind;
        if (options.audio) {
          mediaKind = 'audio';
        } else if (options.video) {
          mediaKind = 'video';
        } else {
          mediaKind = await select<MediaKind>({
            message: 'Select format:',
            choices: [
              { name: 'Video (MP4)', value: 'video' },
              { name: 'Audio (MP3)', value: 'audio' },
            ],
          });
        }

        const useCookies = await select<'yes' | 'no'>({
          message: 'Use cookies from browser (for restricted videos)?',
          choices: [
            { name: 'No', value: 'no' },
            { name: 'Yes', value: 'yes' },
          ],
        });

        let browserCookies:
          | 'chrome'
          | 'firefox'
          | 'edge'
          | 'brave'
          | 'safari'
          | null = null;
        if (useCookies === 'yes') {
          browserCookies = await select<
            'chrome' | 'firefox' | 'edge' | 'brave' | 'safari'
          >({
            message: 'Select browser:',
            choices: [
              { name: 'Brave', value: 'brave' },
              { name: 'Chrome', value: 'chrome' },
              { name: 'Firefox', value: 'firefox' },
              { name: 'Edge', value: 'edge' },
            ],
          });
        }

        const overrides: Partial<DownloadProfile> = {
          mediaKind,
          browserCookies,
        };

        if (mediaKind === 'video') {
          let quality: VideoQuality;
          if (options.quality) {
            quality = options.quality as VideoQuality;
            if (options.quality !== 'best') {
              quality = parseInt(options.quality, 10) as VideoQuality;
            }
          } else {
            quality = await select<VideoQuality>({
              message: 'Select quality:',
              choices: [
                { name: 'Best Available', value: 'best' },
                { name: '1080p', value: 1080 },
                { name: '720p', value: 720 },
                { name: '480p', value: 480 },
              ],
            });
          }
          overrides.videoQuality = quality;

          let wantSubtitles: 'yes' | 'no';
          if (options.subLang) {
            wantSubtitles = 'yes';
          } else {
            wantSubtitles = await select<'yes' | 'no'>({
              message: 'Download subtitles?',
              choices: [
                { name: 'No', value: 'no' },
                { name: 'Yes', value: 'yes' },
              ],
            });
          }

          if (wantSubtitles === 'yes') {
            const subtitleLang =
              (options.subLang as 'english' | 'all') ||
              (await select<'english' | 'all'>({
                message: 'Select subtitle language:',
                choices: [
                  { name: 'English', value: 'english' },
                  { name: 'All available', value: 'all' },
                ],
              }));

            const subtitleOutput =
              (options.subMode as 'embed' | 'separate') ||
              (await select<'embed' | 'separate'>({
                message: 'Subtitle output format:',
                choices: [
                  { name: 'Embed into video', value: 'embed' },
                  { name: 'Separate file', value: 'separate' },
                ],
              }));

            overrides.subtitleOptions = {
              mode: subtitleLang,
              output: subtitleOutput,
            };
          }
        } else {
          const bitrate = await select<AudioBitrate>({
            message: 'Select audio bitrate:',
            choices: [
              { name: '320kbps (Best)', value: 320 },
              { name: '192kbps (Good)', value: 192 },
              { name: '128kbps (Standard)', value: 128 },
            ],
          });
          overrides.audioOptions = { format: 'mp3', bitrate };
        }

        const customEmbedMetadata = await select<false | true>({
          message: 'Embed custom metadata?',
          choices: [
            { name: 'No', value: false },
            { name: 'Yes', value: true },
          ],
          default: false,
        });

        if (customEmbedMetadata) {
          const embedMetadata = await select<'yes' | 'no'>({
            message: 'Embed metadata?',
            choices: [
              { name: 'Yes', value: 'yes' },
              { name: 'No', value: 'no' },
            ],
          });

          const embedThumbnail = await select<'yes' | 'no'>({
            message: 'Embed thumbnail?',
            choices: [
              { name: 'Yes', value: 'yes' },
              { name: 'No', value: 'no' },
            ],
          });

          const embedChapters = await select<'yes' | 'no'>({
            message: 'Embed chapters?',
            choices: [
              { name: 'Yes', value: 'yes' },
              { name: 'No', value: 'no' },
            ],
          });

          overrides.metadataOptions = {
            embedMetadata: embedMetadata === 'yes',
            embedThumbnail: embedThumbnail === 'yes',
            embedChapters: embedChapters === 'yes',
          };
        }

        profile = this.profileBuilder.build(
          url,
          appConfig,
          undefined,
          overrides
        );
      }

      if (globalOverrides.playlist) {
        profile.playlist = globalOverrides.playlist;
      }
      if (globalOverrides.outputDirectory) {
        profile.outputDirectory = globalOverrides.outputDirectory;
      }
      if (globalOverrides.useAria2) {
        profile.useAria2 = globalOverrides.useAria2;
      }

      // Calculate estimated size
      const estimator = new ArtifactSizeEstimator();
      const estimatedSize = estimator.estimate(profile, inspectRes.value);
      if (estimatedSize) {
        profile.estimatedSize = estimatedSize;
      }

      if (options.verbose) {
        this.eventStream.emit({
          type: 'debug',
          message: `preset: ${selectedPresetId}`,
        });
        this.eventStream.emit({
          type: 'debug',
          message: `output directory: ${profile.outputDirectory}`,
        });
        this.eventStream.emit({
          type: 'debug',
          message: `media kind: ${profile.mediaKind}`,
        });
        this.eventStream.emit({
          type: 'debug',
          message: `quality: ${profile.videoQuality || 'N/A'}`,
        });
        this.eventStream.emit({
          type: 'debug',
          message: `subtitles: ${profile.subtitleOptions?.mode || 'none'}`,
        });
      }

      // 4.5 Filename Preview
      const resolvedFilename = await this.filenamePreview.render(profile);

      // 5. Execute workflow
      if (profile.mediaKind === 'video') {
        let res;
        if (
          profile.subtitleOptions &&
          profile.subtitleOptions.mode !== 'none'
        ) {
          console.log(
            chalk.blue('\nℹ️ Subtitles requested. Using SubtitleWorkflow...')
          );
          res = await this.subtitleWorkflow.run(profile);
        } else {
          res = await this.mp4Workflow.run(profile);
        }

        if (res.ok) {
          const saveMessage = resolvedFilename.startsWith('Error:')
            ? `\n📂 File saved to directory: ${profile.outputDirectory}`
            : `\n📂 File saved to: ${resolvedFilename}`;

          console.log(chalk.green(saveMessage));
        }
      } else {
        const res = await this.mp3Workflow.run(profile);
        if (res.ok) {
          const saveMessage = resolvedFilename.startsWith('Error:')
            ? `\n📂 File saved to directory: ${profile.outputDirectory}`
            : `\n📂 File saved to: ${resolvedFilename}`;

          console.log(chalk.green(saveMessage));
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'ExitPromptError') {
        console.log(chalk.yellow('\n⚠️ Operation aborted by user.'));
      } else {
        console.log(
          chalk.red(
            `\n✘ Unexpected error: ${e instanceof Error ? e.message : String(e)}`
          )
        );
      }
    } finally {
      renderer.stop();
      if (debugRenderer) {
        debugRenderer.stop();
      }
    }
  }
}
