import { describe, expect, test } from 'bun:test';
import { EventStream } from '../../src/core/runtime/event-stream';

describe('EventStream', () => {
  test('should emit progress, warning, and error events', () => {
    const stream = new EventStream();
    const events: any[] = [];
    stream.subscribe((e) => events.push(e));

    stream.processLine('[download]  45.2% of 52.10MiB at 2.31MiB/s ETA 00:13');
    expect(events[0].type).toBe('progress');
    expect(events[0].progress.percentage).toBe(45.2);

    stream.processLine('WARNING: This is a warning');
    expect(events[1].type).toBe('warning');
    expect(events[1].message).toBe('This is a warning');

    stream.processLine('ERROR: This is an error');
    expect(events[2].type).toBe('error');
    expect(events[2].message).toBe('This is an error');
  });

  test('should handle unsubscribe and isolate subscriber failures', () => {
    const stream = new EventStream();
    const events: any[] = [];

    const unsub = stream.subscribe((e) => events.push(e));
    unsub();
    stream.subscribe(() => {
      throw new Error('fail');
    });
    stream.subscribe((e) => events.push(e));

    stream.processLine('WARNING: test');
    expect(events.length).toBe(1);
  });
});
