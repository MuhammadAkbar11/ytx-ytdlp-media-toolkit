/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from 'bun:test';
import { DebugRenderer } from '../../src/cli/renderers/debug-renderer';
import { EventStream } from '../../src/core/runtime/event-stream';
import { DownloadEvent } from '../../src/types/events';

describe('DebugRenderer', () => {
  test('should render debug events when debug is true', () => {
    const eventStream = new EventStream();
    const renderer = new DebugRenderer(eventStream, {
      verbose: false,
      debug: true,
    });

    // Capture console.log
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string, arg2?: any) => {
      if (arg2) logs.push(`${msg} ${arg2}`);
      else logs.push(msg);
    };

    renderer.start();

    const event: DownloadEvent = { type: 'started' };
    eventStream.emit(event);

    renderer.stop();
    console.log = originalLog;

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('[DEBUG]');
    expect(logs[0]).toContain(JSON.stringify(event));
  });

  test('should render verbose events when verbose is true', () => {
    const eventStream = new EventStream();
    const renderer = new DebugRenderer(eventStream, {
      verbose: true,
      debug: false,
    });

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    renderer.start();

    eventStream.emit({ type: 'started' });
    eventStream.emit({
      type: 'progress',
      progress: {
        percentage: 50,
        speed: '1MB/s',
        eta: '5s',
        totalSize: '10MB',
      },
    });
    eventStream.emit({ type: 'debug', message: 'Test debug message' });

    renderer.stop();
    console.log = originalLog;

    expect(logs.length).toBe(3);
    expect(logs[0]).toContain('[VERBOSE]');
    expect(logs[0]).toContain('Download started');
    expect(logs[1]).toContain('Progress: 50%');
    expect(logs[2]).toContain('Test debug message');
  });

  test('should render nothing when both are false', () => {
    const eventStream = new EventStream();
    const renderer = new DebugRenderer(eventStream, {
      verbose: false,
      debug: false,
    });

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    renderer.start();

    eventStream.emit({ type: 'started' });

    renderer.stop();
    console.log = originalLog;

    expect(logs.length).toBe(0);
  });
});
