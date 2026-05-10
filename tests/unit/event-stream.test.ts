import { describe, expect, test } from 'bun:test';
import { EventStream } from '../../src/core/runtime/event-stream';
import { DownloadEvent } from '../../src/types/events';

describe('EventStream', () => {
  test('should emit progress events', () => {
    const stream = new EventStream();
    const events: DownloadEvent[] = [];
    
    stream.subscribe((e) => events.push(e));

    const line = '[download]  45.2% of 52.10MiB at 2.31MiB/s ETA 00:13';
    stream.processLine(line);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('progress');
    if (events[0].type === 'progress') {
      expect(events[0].progress.percentage).toBe(45.2);
    }
  });

  test('should emit warning events', () => {
    const stream = new EventStream();
    const events: DownloadEvent[] = [];
    
    stream.subscribe((e) => events.push(e));

    const line = 'WARNING: This is a warning';
    stream.processLine(line);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('warning');
    if (events[0].type === 'warning') {
      expect(events[0].message).toBe('This is a warning');
    }
  });

  test('should emit error events', () => {
    const stream = new EventStream();
    const events: DownloadEvent[] = [];
    
    stream.subscribe((e) => events.push(e));

    const line = 'ERROR: This is an error';
    stream.processLine(line);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('error');
    if (events[0].type === 'error') {
      expect(events[0].message).toBe('This is an error');
    }
  });

  test('should handle unsubscribe', () => {
    const stream = new EventStream();
    const events: DownloadEvent[] = [];
    
    const unsubscribe = stream.subscribe((e) => events.push(e));
    unsubscribe();

    const line = 'WARNING: This is a warning';
    stream.processLine(line);

    expect(events.length).toBe(0);
  });
});
