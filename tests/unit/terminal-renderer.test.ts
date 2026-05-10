import { describe, expect, test } from 'bun:test';
import { TerminalRenderer } from '../../src/cli/renderers/terminal-renderer';
import { EventStream } from '../../src/core/runtime/event-stream';

describe('TerminalRenderer', () => {
  test('should render progress events', () => {
    const eventStream = new EventStream();
    const renderer = new TerminalRenderer(eventStream);
    
    // Capture process.stdout.write
    const writes: string[] = [];
    const originalWrite = process.stdout.write;
    // @ts-ignore
    process.stdout.write = (msg: string) => {
      writes.push(msg);
      return true;
    };

    renderer.start();

    eventStream.emit({ type: 'progress', progress: { percentage: 50, speed: '1MB/s', eta: '5s', totalSize: '10MB' } });

    renderer.stop();
    process.stdout.write = originalWrite;

    expect(writes.length).toBe(2); // One for progress, one for newline in stop
    expect(writes[0]).toContain('50%');
    expect(writes[0]).toContain('1MB/s');
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

    expect(logs.length).toBe(2);
    expect(logs[0]).toContain('Download started');
    expect(logs[1]).toContain('Download completed successfully');
  });
});
