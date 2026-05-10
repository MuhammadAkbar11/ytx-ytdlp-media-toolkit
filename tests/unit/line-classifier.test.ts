import { describe, expect, test } from 'bun:test';
import { LineClassifier } from '../../src/core/runtime/line-classifier';

describe('LineClassifier', () => {
  const classifier = new LineClassifier();

  test('should classify progress lines', () => {
    const line = '[download]  45.2% of 10.00MiB at 1.23MiB/s ETA 00:05';
    const res = classifier.classify(line);
    expect(res.type).toBe('progress');
  });

  test('should classify warning lines', () => {
    const line = 'WARNING: This is a warning';
    const res = classifier.classify(line);
    expect(res.type).toBe('warning');
  });

  test('should classify error lines', () => {
    const line = 'ERROR: This is an error';
    const res = classifier.classify(line);
    expect(res.type).toBe('error');
  });

  test('should classify info lines with known prefixes', () => {
    const line = '[ExtractAudio] Extracting audio';
    const res = classifier.classify(line);
    expect(res.type).toBe('info');
  });

  test('should classify general bracket lines as info', () => {
    const line = '[youtube] 123: Downloading webpage';
    const res = classifier.classify(line);
    expect(res.type).toBe('info');
  });

  test('should classify unknown lines as unknown', () => {
    const line = 'Just some text';
    const res = classifier.classify(line);
    expect(res.type).toBe('unknown');
  });
});
