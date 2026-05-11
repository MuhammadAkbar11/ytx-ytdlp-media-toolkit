import { BaseDownloadWorkflow } from './base-download-workflow';
import { ProfileValidator } from '../profiles/profile-validator';
import { ArgumentBuilder } from '../downloader/argument-builder';
import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { EventStream } from '../runtime/event-stream';

export class PlaylistWorkflow extends BaseDownloadWorkflow {
  constructor(
    profileValidator: ProfileValidator,
    argumentBuilder: ArgumentBuilder,
    processRunner: ProcessRunner,
    eventStream: EventStream
  ) {
    super(profileValidator, argumentBuilder, processRunner, eventStream);
  }
}
