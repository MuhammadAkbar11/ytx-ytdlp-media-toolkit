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

  test('should isolate subscriber failures', () => {
    const stream = new EventStream();
    const events: DownloadEvent[] = [];
    
    stream.subscribe(() => {
      throw new Error('Subscriber failed');
    });
    
    stream.subscribe((e) => events.push(e));

    const line = 'WARNING: This is a warning';
    stream.processLine(line);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('warning');
  });

  test('should handle multiple subscriber failures and continue', () => {
    const stream = new EventStream();
    const events: DownloadEvent[] = [];
    
    stream.subscribe(() => {
      throw new Error('Subscriber 1 failed');
    });
    
    stream.subscribe((e) => events.push(e));
    
    stream.subscribe(() => {
      throw new Error('Subscriber 3 failed');
    });

    stream.subscribe((e) => events.push(e));

    const line = 'WARNING: This is a warning';
    stream.processLine(line);

    expect(events.length).toBe(2);
    expect(events[0].type).toBe('warning');
    expect(events[1].type).toBe('warning');
  });

  test('should emit processing events for post-download tasks', () => {
    const stream = new EventStream();
    const events: DownloadEvent[] = [];
    
    stream.subscribe((e) => events.push(e));

    const mergerLine = '[Merger] Merging formats into "output.mp4"';
    stream.processLine(mergerLine);

    const extractLine = '[ExtractAudio] Destination: output.mp3';
    stream.processLine(extractLine);

    const metadataLine = '[Metadata] Adding metadata to "output.mp4"';
    stream.processLine(metadataLine);

    expect(events.length).toBe(3);
    expect(events[0].type).toBe('processing');
    expect(events[0].type === 'processing' && events[0].action).toBe('Merging video and audio formats...');
    expect(events[1].type).toBe('processing');
    expect(events[1].type === 'processing' && events[1].action).toBe('Extracting and converting audio...');
    expect(events[2].type).toBe('processing');
    expect(events[2].type === 'processing' && events[2].action).toBe('Embedding metadata...');
  });
});
