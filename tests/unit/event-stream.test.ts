import { describe, expect, test, spyOn } from 'bun:test';
import { EventStream } from '../../src/core/runtime/event-stream';
import { ConsoleLogger } from '../../src/utils/logger';

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

  test('should handle unsubscribe', () => {
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

  describe('subscriber error isolation', () => {
    test('should isolate throwing subscriber and deliver event to remaining subscribers', () => {
      const stream = new EventStream();
      const eventsA: any[] = [];
      const eventsC: any[] = [];

      stream.subscribe((e) => eventsA.push(e));
      stream.subscribe(() => {
        throw new Error('subscriber B failure');
      });
      stream.subscribe((e) => eventsC.push(e));

      stream.emit({ type: 'warning', message: 'test' });

      expect(eventsA.length).toBe(1);
      expect(eventsA[0].type).toBe('warning');
      expect(eventsC.length).toBe(1);
      expect(eventsC[0].type).toBe('warning');
    });

    test('should isolate multiple throwing subscribers', () => {
      const stream = new EventStream();
      const eventsD: any[] = [];

      stream.subscribe(() => {
        throw new Error('first failure');
      });
      stream.subscribe((e) => eventsD.push(e));
      stream.subscribe(() => {
        throw new Error('second failure');
      });

      stream.emit({ type: 'error', message: 'test error' });

      expect(eventsD.length).toBe(1);
      expect(eventsD[0].type).toBe('error');
    });

    test('should continue emission when all subscribers throw', () => {
      const stream = new EventStream();

      stream.subscribe(() => {
        throw new Error('sub 1');
      });
      stream.subscribe(() => {
        throw new Error('sub 2');
      });

      // Should not throw
      expect(() => {
        stream.emit({ type: 'completed' });
      }).not.toThrow();
    });

    test('should handle non-Error thrown values', () => {
      const stream = new EventStream();
      const events: any[] = [];

      stream.subscribe(() => {
        throw 'string error';
      });
      stream.subscribe((e) => events.push(e));

      stream.emit({ type: 'processing', action: 'test' });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('processing');
    });

    test('should log subscriber failures via ConsoleLogger', () => {
      const stream = new EventStream();
      const warnSpy = spyOn(ConsoleLogger.prototype, 'warn');

      stream.subscribe(() => {
        throw new Error('boom');
      });

      stream.emit({ type: 'warning', message: 'test' });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Subscriber error during "warning" event: boom')
      );

      warnSpy.mockRestore();
    });

    test('should preserve event ordering across subscribers', () => {
      const stream = new EventStream();
      const received: string[] = [];

      stream.subscribe((e) => received.push(`A:${e.type}`));
      stream.subscribe(() => {
        if (received.length === 1) throw new Error('fail on first event');
      });
      stream.subscribe((e) => received.push(`C:${e.type}`));

      stream.emit({ type: 'warning', message: 'first' });
      stream.emit({ type: 'error', message: 'second' });

      expect(received).toEqual([
        'A:warning',
        'C:warning',
        'A:error',
        'C:error',
      ]);
    });

    test('should not affect processLine event delivery when subscriber throws', () => {
      const stream = new EventStream();
      const events: any[] = [];

      stream.subscribe((e) => {
        if (e.type === 'progress') throw new Error('progress handler fail');
      });
      stream.subscribe((e) => events.push(e));

      stream.processLine('[download]  10.0% of 100MiB at 5MiB/s ETA 00:18');
      stream.processLine('WARNING: some warning');

      expect(events.length).toBe(2);
      expect(events[0].type).toBe('progress');
      expect(events[1].type).toBe('warning');
    });
  });
});