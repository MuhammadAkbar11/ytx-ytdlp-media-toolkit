import { describe, expect, test } from 'bun:test';
import { LineClassifier } from '../../src/core/runtime/line-classifier';

describe('LineClassifier', () => {
  test('should classify progress lines', () => {
    const c = new LineClassifier();
    expect(
      c.classify('[download]  45.2% of 52.10MiB at 2.31MiB/s ETA 00:13').type
    ).toBe('progress');
  });

  test('should classify warning and error lines', () => {
    const c = new LineClassifier();
    expect(c.classify('WARNING: test').type).toBe('warning');
    expect(c.classify('ERROR: test').type).toBe('error');
  });
});
