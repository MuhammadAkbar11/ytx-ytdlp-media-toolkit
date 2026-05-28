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
import { OutputPathResolver } from '../../core/filesystem/output-path-resolver';

import { ArtifactSizeEstimator } from '../../core/runtime/artifact-size-estimator';
import { RuntimeContextBuilder } from '../../core/runtime/runtime-context';
import { RuntimePreflightResolver } from '../../core/preflight/runtime-preflight-resolver';
import { PlaylistInspector } from '../../core/playlist/playlist-inspector';
import { SearchablePlaylistSelector } from '../../core/prompts/searchable-playlist-selector';
import { BrowserName } from '../../types/common';
import chalk from 'chalk';
import ora from 'ora';
import { gracefulShutdownManager } from '../../core/runtime/graceful-shutdown';
import { runtimeEnvironment } from '../../core/runtime/runtime-environment';
import { FailureClassifier } from '../../core/errors/failure-classifier';
import { DiagnosticFormatter } from '../../core/errors/diagnostic-formatter';
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
  browser?: string | boolean;
}

export class DownloadCommand {
  private failureClassifier: FailureClassifier;
  private diagnosticFormatter: DiagnosticFormatter;

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
    private outputPathResolver: OutputPathResolver,
    private runtimePreflightResolver: RuntimePreflightResolver,
    private playlistInspector: PlaylistInspector,
    private searchablePlaylistSelector: SearchablePlaylistSelector
  ) {
    this.failureClassifier = new FailureClassifier();
    this.diagnosticFormatter = new DiagnosticFormatter();
  }

  async execute(
    initialUrl?: string,
    options: DownloadOptions = {}
  ): Promise<void> {
    const renderer = new TerminalRenderer(this.eventStream);
    renderer.start();
    gracefulShutdownManager.registerCleanup(() => renderer.stop());

    try {
      // 1. Prompt for URL if not provided
      let url = initialUrl;
      if (!url) {
        if (!runtimeEnvironment.isInteractive) {
          console.log(chalk.red('✘ URL is required in non-interactive mode.'));
          console.log(chalk.yellow('\n  Usage: ytx <url>'));
          return;
        }
        url = await input({
          message: 'Enter YouTube URL:',
          validate: (val) => validateUrl(val).ok || 'Invalid URL',
        });
      } else {
        const valRes = validateUrl(url);
        if (!valRes.ok) {
          console.log(chalk.red('✘ Invalid URL provided.'));
          console.log(
            chalk.yellow(
              '\nSupported formats: youtube.com/watch, youtu.be, youtube.com/playlist, youtube.com/shorts'
            )
          );
          return;
        }
      }

      const appConfig = this.configService.getAll();

      // 1.5 Browser Cookie Resolution
      let browserCookies: BrowserName | null = null;

      if (options.browser === true) {
        if (!runtimeEnvironment.isInteractive) {
          console.log(
            chalk.yellow(
              '⚠ --browser flag without value ignored in non-interactive mode.'
            )
          );
        } else {
          browserCookies = await select<BrowserName>({
            message: 'Select browser:',
            choices: [
              { name: 'Brave', value: 'brave' },
              { name: 'Chrome', value: 'chrome' },
              { name: 'Firefox', value: 'firefox' },
              { name: 'Edge', value: 'edge' },
              { name: 'Safari', value: 'safari' },
            ],
          });
        }
      } else if (typeof options.browser === 'string') {
        browserCookies = options.browser as BrowserName;
      } else if (appConfig.preferredBrowser) {
        browserCookies = appConfig.preferredBrowser;
      }

      const runtimeContextBuilder = new RuntimeContextBuilder();
      runtimeContextBuilder.withBrowserCookies(browserCookies);
      const runtimeContext = runtimeContextBuilder.build();

      // 1.8 Runtime Preflight Resolution
      const preflightSpinner = runtimeEnvironment.isInteractive
        ? ora('Resolving runtime capabilities...').start()
        : null;
      if (!runtimeEnvironment.isInteractive) {
        console.log(chalk.blue('➤ Resolving runtime capabilities...'));
      }
      const preparedContext =
        await this.runtimePreflightResolver.resolve(runtimeContext);
      preflightSpinner?.stop();

      if (!preparedContext.capabilities.ytDlpAvailable) {
        console.log(chalk.red('✘ yt-dlp was not found.'));
        console.log(
          chalk.yellow(
            '\nInstall yt-dlp and ensure it is available in PATH.\n\n  pip install yt-dlp\n\nVerify with: ytx doctor'
          )
        );
        return;
      }

      if (preparedContext.capabilities.ffmpegAvailable === false) {
        console.log(
          chalk.yellow(
            '⚠ ffmpeg was not detected. Merging and post-processing may fail.\n  Install ffmpeg: sudo apt install ffmpeg'
          )
        );
      }

      // 2. Inspect the URL
      const spinner = runtimeEnvironment.isInteractive
        ? ora('Inspecting URL...').start()
        : null;
      if (!runtimeEnvironment.isInteractive) {
        console.log(chalk.blue('➤ Inspecting URL...'));
      }
      const inspectRes = await this.inspectionService.inspect(
        url,
        runtimeContext
      );
      spinner?.stop();

      if (!inspectRes.ok) {
        const classified = this.failureClassifier.classifyInspectionFailure(
          inspectRes.error.message,
          1
        );
        console.log(
          this.diagnosticFormatter.formatFailure(classified, options.verbose)
        );
        return;
      }

      console.log(chalk.green(`✔ Found: ${inspectRes.value.title}`));

      // 2.5 Playlist Prompt
      let globalOverrides: Partial<DownloadProfile> = {};
      if (options.aria2) {
        globalOverrides.useAria2 = true;
      }
      if (browserCookies) {
        globalOverrides.browserCookies = browserCookies;
      }
      const valRes = validateUrl(url);
      if (valRes.ok && valRes.value.type === 'playlist') {
        let playlistMode: 'entire_playlist' | 'first_video' | 'selected_items' =
          'entire_playlist';
        let selectedItems: string | undefined;

        if (runtimeEnvironment.isInteractive) {
          playlistMode = await select<
            'entire_playlist' | 'first_video' | 'selected_items'
          >({
            message: 'Playlist detected. How do you want to proceed?',
            choices: [
              { name: 'Download entire playlist', value: 'entire_playlist' },
              { name: 'Download first item only', value: 'first_video' },
              { name: 'Select specific items', value: 'selected_items' },
            ],
          });

          if (playlistMode === 'selected_items') {
            const spinner = ora('Fetching playlist items...').start();
            const itemsRes = await this.playlistInspector.getPlaylistItems(
              url,
              browserCookies || undefined
            );
            spinner.stop();

            if (!itemsRes.ok) {
              console.log(
                chalk.red(
                  `\n✘ Failed to fetch playlist items: ${itemsRes.error}`
                )
              );
              selectedItems = await input({
                message: 'Enter items manually (e.g. 1,3,5-10):',
                validate: (val) => val.trim().length > 0 || 'Cannot be empty',
              });
            } else {
              const selection =
                await this.searchablePlaylistSelector.promptForSelection(
                  itemsRes.value
                );
              if (!selection) {
                console.log(
                  chalk.yellow(
                    '\n⚠ No items selected. Falling back to entire playlist.'
                  )
                );
                playlistMode = 'entire_playlist';
              } else {
                selectedItems = selection;
              }
            }
          }
        } else {
          // Non-interactive fallback: we must have a flag or we default to entire_playlist
          playlistMode = 'entire_playlist';
        }

        globalOverrides.playlist = {
          mode: playlistMode,
          selectedItems,
        };
      }

      const resolvedOutputPath = await this.outputPathResolver.resolve(
        options.output,
        appConfig.outputPath
      );
      if (
        options.output &&
        resolvedOutputPath !==
          this.outputPathResolver.normalizePath(options.output)
      ) {
        console.log(
          chalk.yellow(
            `⚠ Output path "${options.output}" is not valid. Using default: ${resolvedOutputPath}`
          )
        );
      }
      globalOverrides.outputPath = resolvedOutputPath;

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
        console.log(chalk.blue('ⓘ Dry run enabled. Previewing execution...'));
        const dryRunRes = await this.dryRunWorkflow.run(
          url,
          appConfig,
          selectedPresetId
        );

        if (!dryRunRes.ok) {
          console.log(chalk.red('✘ Dry run failed:'));
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

        const overrides: Partial<DownloadProfile> = {
          mediaKind,
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
      if (globalOverrides.outputPath) {
        profile.outputPath = globalOverrides.outputPath;
      }
      if (globalOverrides.useAria2) {
        profile.useAria2 = globalOverrides.useAria2;
      }
      if (globalOverrides.browserCookies) {
        profile.browserCookies = globalOverrides.browserCookies;
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
          message: `output path: ${profile.outputPath}`,
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

      const checkSymbol = chalk.green('✔');
      // 5. Execute workflow
      if (profile.mediaKind === 'video') {
        let res;
        if (
          profile.subtitleOptions &&
          profile.subtitleOptions.mode !== 'none'
        ) {
          console.log(
            chalk.blue('\nⓘ Subtitles requested. Using SubtitleWorkflow...')
          );
          res = await this.subtitleWorkflow.run(profile);
        } else {
          res = await this.mp4Workflow.run(profile);
        }

        if (res.ok) {
          const saveMessage = resolvedFilename.startsWith('Error:')
            ? `${checkSymbol} File saved to directory: ${profile.outputPath}`
            : `${checkSymbol} File saved to: ${resolvedFilename}`;
          console.log(chalk.green(saveMessage));
        } else {
          this.printWorkflowFailure(res.error, options.verbose);
        }
      } else {
        const res = await this.mp3Workflow.run(profile);
        if (res.ok) {
          const saveMessage = resolvedFilename.startsWith('Error:')
            ? `\n${checkSymbol} File saved to directory: ${profile.outputPath}`
            : `\n${checkSymbol} File saved to: ${resolvedFilename}`;
          console.log(chalk.green(saveMessage));
        } else {
          this.printWorkflowFailure(res.error, options.verbose);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'ExitPromptError') {
        console.log(chalk.yellow('\n⚠ Operation aborted by user.'));
      } else {
        const classified = this.failureClassifier.classifyFromError(e);
        console.log(
          '\n' +
            this.diagnosticFormatter.formatFailure(classified, options.verbose)
        );
      }
    } finally {
      renderer.stop();
    }
  }

  private printWorkflowFailure(
    issues: { category: string; message: string }[],
    verbose?: boolean
  ): void {
    for (const issue of issues) {
      const result = { exitCode: 1, stdout: '', stderr: issue.message };
      const classified = this.failureClassifier.classifyFromProcessResult(
        result,
        'yt-dlp'
      );
      console.log(
        '\n' + this.diagnosticFormatter.formatFailure(classified, verbose)
      );
    }
  }
}
