import { describe, expect, test } from 'bun:test';
import { StreamNormalizer } from '../../src/core/runtime/stream-normalizer';

describe('StreamNormalizer', () => {
  test('should handle simple newlines', () => {
    const normalizer = new StreamNormalizer();
    const lines = normalizer.processChunk('line1\nline2\n');
    expect(lines).toEqual(['line1', 'line2']);
    expect(normalizer.flush()).toEqual([]);
  });

  test('should handle partial chunks', () => {
    const normalizer = new StreamNormalizer();
    
    // Chunk 1: "li"
    expect(normalizer.processChunk('li')).toEqual([]);
    
    // Chunk 2: "ne1\n"
    expect(normalizer.processChunk('ne1\n')).toEqual(['line1']);
  });

  test('should handle carriage returns', () => {
    const normalizer = new StreamNormalizer();
    const lines = normalizer.processChunk('progress 1\rprogress 2\r');
    expect(lines).toEqual(['progress 1', 'progress 2']);
  });

  test('should handle mixed newlines and carriage returns', () => {
    const normalizer = new StreamNormalizer();
    const lines = normalizer.processChunk('progress 1\rprogress 2\nprogress 3\r\n');
    expect(lines).toEqual(['progress 1', 'progress 2', 'progress 3']);
  });

  test('should flush remaining buffer on end of stream', () => {
    const normalizer = new StreamNormalizer();
    expect(normalizer.processChunk('incomplete line')).toEqual([]);
    expect(normalizer.flush()).toEqual(['incomplete line']);
    expect(normalizer.flush()).toEqual([]); // subsequent calls should be empty
  });

  test('should handle rapid progress updates and preserve order', () => {
    const normalizer = new StreamNormalizer();
    const lines: string[] = [];
    
    lines.push(...normalizer.processChunk('[download] 1.2%...'));
    lines.push(...normalizer.processChunk('\r'));
    lines.push(...normalizer.processChunk('[download] 2.5%...'));
    lines.push(...normalizer.processChunk('\r'));
    lines.push(...normalizer.processChunk('[download] 5.0%...'));
    lines.push(...normalizer.flush());

    expect(lines).toEqual([
      '[download] 1.2%...',
      '[download] 2.5%...',
      '[download] 5.0%...',
    ]);
  });
});
