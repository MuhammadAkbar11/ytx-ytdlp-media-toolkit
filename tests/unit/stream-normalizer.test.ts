import { describe, expect, test } from 'bun:test';
import { StreamNormalizer } from '../../src/core/runtime/stream-normalizer';

describe('StreamNormalizer', () => {
  test('should handle simple newlines and partial chunks', () => {
    const n = new StreamNormalizer();
    expect(n.processChunk('hello\nworld\n')).toEqual(['hello', 'world']);
    expect(n.processChunk('partial')).toEqual([]);
    expect(n.processChunk(' chunk\n')).toEqual(['partial chunk']);
  });

  test('should handle carriage returns and mixed newlines', () => {
    const n = new StreamNormalizer();
    expect(n.processChunk('line1\r\nline2\rline3\n')).toEqual([
      'line1',
      'line2',
      'line3',
    ]);
  });
});
