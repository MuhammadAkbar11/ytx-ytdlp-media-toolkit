import { ConsoleLogger } from './utils/logger';
import { ConfigService } from './core/config/config.service';
import { BunProcessRunner } from './infrastructure/process/bun-process-runner';
import { InspectionService } from './core/downloader/inspection.service';
import { ArgumentBuilder } from './core/downloader/argument-builder';
import { ProfileValidator } from './core/profiles/profile-validator';
import { ProfileBuilder } from './core/profiles/profile-builder';
import { EventStream } from './core/runtime/event-stream';
import { Mp4DownloadWorkflow } from './core/workflows/mp4-download-workflow';
import { Mp3DownloadWorkflow } from './core/workflows/mp3-download-workflow';
import { SubtitleWorkflow } from './core/workflows/subtitle-workflow';
import { DryRunWorkflow } from './core/workflows/dry-run-workflow';
import { PresetRegistry } from './core/presets/preset-registry';
import { FormatNormalizer } from './core/formats/format-normalizer';
import { FilenamePreview } from './cli/renderers/filename-preview';
import { DirectoryValidator } from './core/filesystem/directory-validator';
import { SessionInspectionCache } from './core/cache/session-inspection-cache';
import { TransientFailureClassifier } from './core/runtime/transient-failure-classifier';
import { RetryingProcessRunner } from './core/runtime/retrying-process-runner';
import { RuntimePreflightResolver } from './core/preflight/runtime-preflight-resolver';
import { PlaylistInspector } from './core/playlist/playlist-inspector';
import { SearchablePlaylistSelector } from './core/prompts/searchable-playlist-selector';

export function bootstrap() {
  const logger = new ConsoleLogger();
  const configService = new ConfigService();
  const processRunner = new BunProcessRunner();
  const presetRegistry = new PresetRegistry();
  const profileBuilder = new ProfileBuilder();
  const formatNormalizer = new FormatNormalizer();
  const sessionInspectionCache = new SessionInspectionCache();
  const eventStream = new EventStream();
  
  const classifier = new TransientFailureClassifier();
  const retryingProcessRunner = new RetryingProcessRunner(processRunner, classifier, eventStream);
  
  const inspectionService = new InspectionService(retryingProcessRunner, sessionInspectionCache);
  const argumentBuilder = new ArgumentBuilder();
  const profileValidator = new ProfileValidator();
  const runtimePreflightResolver = new RuntimePreflightResolver(processRunner);

  const mp4Workflow = new Mp4DownloadWorkflow(profileValidator, argumentBuilder, retryingProcessRunner, eventStream);
  const mp3Workflow = new Mp3DownloadWorkflow(profileValidator, argumentBuilder, retryingProcessRunner, eventStream);
  const subtitleWorkflow = new SubtitleWorkflow(profileValidator, argumentBuilder, retryingProcessRunner, eventStream);
  const dryRunWorkflow = new DryRunWorkflow(inspectionService, formatNormalizer, profileBuilder, profileValidator, presetRegistry, argumentBuilder);
  const filenamePreview = new FilenamePreview(retryingProcessRunner, argumentBuilder);
  const playlistInspector = new PlaylistInspector(retryingProcessRunner);
  const searchablePlaylistSelector = new SearchablePlaylistSelector();

  return {
    logger,
    configService,
    processRunner,
    inspectionService,
    eventStream,
    mp4Workflow,
    mp3Workflow,
    subtitleWorkflow,
    dryRunWorkflow,
    presetRegistry,
    profileBuilder,
    filenamePreview,
    runtimePreflightResolver,
    playlistInspector,
    searchablePlaylistSelector,
    directoryValidator: new DirectoryValidator(),
  };
}
