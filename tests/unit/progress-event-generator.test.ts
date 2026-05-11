import { describe, expect, test } from 'bun:test';
import { ProgressEventGenerator } from '../../src/core/runtime/progress-event-generator';

describe('ProgressEventGenerator', () => {
  test('should generate progress event for valid line', () => {
    const generator = new ProgressEventGenerator();
    const line = '[download]  12.5% of 100.00MiB at 5.00MiB/s ETA 00:12';
    
    const event = generator.generate(line);
    
    expect(event).not.toBeNull();
    expect(event?.type).toBe('progress');
    
    if (event && event.type === 'progress') {
      expect(event.progress.percentage).toBe(12.5);
      expect(event.progress.speed).toBe('5.00MiB/s');
      expect(event.progress.eta).toBe('00:12');
    } else {
      throw new Error('Event is not of type progress');
    }
  });

  test('should suppress duplicate progress events', () => {
    const generator = new ProgressEventGenerator();
    const line = '[download]  12.5% of 100.00MiB at 5.00MiB/s ETA 00:12';
    
    const event1 = generator.generate(line);
    const event2 = generator.generate(line); // Duplicate
    
    expect(event1).not.toBeNull();
    expect(event2).toBeNull();
  });

  test('should not suppress events if fields change', () => {
    const generator = new ProgressEventGenerator();
    const line1 = '[download]  12.5% of 100.00MiB at 5.00MiB/s ETA 00:12';
    const line2 = '[download]  13.2% of 100.00MiB at 4.90MiB/s ETA 00:11';
    
    const event1 = generator.generate(line1);
    const event2 = generator.generate(line2);
    
    expect(event1).not.toBeNull();
    expect(event2).not.toBeNull();
    
    if (event2 && event2.type === 'progress') {
      expect(event2.progress.percentage).toBe(13.2);
    } else {
      throw new Error('Event2 is not of type progress');
    }
  });

  test('should return null for non-progress lines', () => {
    const generator = new ProgressEventGenerator();
    const line = '[download] Destination: video.mp4';
    
    const event = generator.generate(line);
    
    expect(event).toBeNull();
  });

  test('should handle lines with only percentage', () => {
    const generator = new ProgressEventGenerator();
    const line = '[download]  50.0%';
    
    const event = generator.generate(line);
    
    expect(event).not.toBeNull();
    
    if (event && event.type === 'progress') {
      expect(event.progress.percentage).toBe(50.0);
    } else {
      throw new Error('Event is not of type progress');
    }
  });
});
