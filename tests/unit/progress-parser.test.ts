import { describe, expect, test } from 'bun:test';
import { ProgressParser } from '../../src/core/runtime/progress-parser';

describe('ProgressParser', () => {
  const parser = new ProgressParser();

  test('should parse full progress line', () => {
    const line = '[download]  45.2% of 52.10MiB at 2.31MiB/s ETA 00:13';
    const res = parser.parse(line);
    expect(res.percentage).toBe(45.2);
    expect(res.totalSize).toBe('52.10MiB');
    expect(res.speed).toBe('2.31MiB/s');
    expect(res.eta).toBe('00:13');
  });

  test('should parse line with unknown total size', () => {
    const line = '[download]   10.00MiB at    1.23MiB/s ETA 00:05';
    const res = parser.parse(line);
    expect(res.downloadedSize).toBe('10.00MiB');
    expect(res.speed).toBe('1.23MiB/s');
    expect(res.eta).toBe('00:05');
  });

  test('should fallback to individual extractions', () => {
    const line = 'Random text with 50.0% and at 1.0MB/s';
    const res = parser.parse(line);
    expect(res.percentage).toBe(50.0);
    expect(res.speed).toBe('1.0MB/s');
  });
});
