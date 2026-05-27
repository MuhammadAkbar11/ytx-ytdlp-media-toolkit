import { describe, expect, test } from 'bun:test';
import { ProgressEventGenerator } from '../../src/core/runtime/progress-event-generator';

describe('ProgressEventGenerator', () => {
  test('should generate progress event for valid line', () => {
    const gen = new ProgressEventGenerator();
    const result = gen.generate(
      '[download]  45.2% of 52.10MiB at 2.31MiB/s ETA 00:13'
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('progress');
    expect(result!.progress.percentage).toBe(45.2);
  });

  test('should suppress duplicate progress events', () => {
    const gen = new ProgressEventGenerator();
    gen.generate('[download]  45.2% of 52.10MiB at 2.31MiB/s ETA 00:13');
    const dup = gen.generate(
      '[download]  45.2% of 52.10MiB at 2.31MiB/s ETA 00:13'
    );
    expect(dup).toBeNull();
  });

  test('should handle lines with only percentage', () => {
    const gen = new ProgressEventGenerator();
    const res = gen.generate('  10.5%');
    expect(res).not.toBeNull();
    expect(res!.progress.percentage).toBe(10.5);
  });
});
