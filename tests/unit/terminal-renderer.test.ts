import { describe, expect, test, mock } from 'bun:test';
import { TerminalRenderer } from '../../src/cli/renderers/terminal-renderer';
import { EventStream } from '../../src/core/runtime/event-stream';
import cliProgress from 'cli-progress';

describe('TerminalRenderer', () => {
  test('should render progress events', () => {
    const eventStream = new EventStream();
    const renderer = new TerminalRenderer(eventStream);

    // Mock cli-progress
    const mockStart = mock();
    const mockUpdate = mock();
    const mockStop = mock();

    cliProgress.SingleBar = class {
      start = mockStart;
      update = mockUpdate;
      stop = mockStop;
    };

    renderer.start();

    eventStream.emit({
      type: 'progress',
      progress: {
        percentage: 50,
        speed: '1MB/s',
        eta: '5s',
        totalSize: '10MB',
      },
    });

    renderer.stop();

    expect(mockStart).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
  });

  test('should render lifecycle events', () => {
    const eventStream = new EventStream();
    const renderer = new TerminalRenderer(eventStream);

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    renderer.start();

    eventStream.emit({ type: 'started' });
    eventStream.emit({ type: 'completed' });

    renderer.stop();
    console.log = originalLog;

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('Download completed successfully');
  });
});
