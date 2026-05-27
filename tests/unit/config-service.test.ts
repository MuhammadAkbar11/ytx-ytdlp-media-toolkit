import { describe, expect, test, mock } from 'bun:test';
import { ConfigService } from '../../src/core/config/config.service';

mock.module('conf', () => ({
  default: class MockConf {
    public store: any;
    constructor(options: any) {
      this.store = { ...options.defaults };
    }
    get(key: string) {
      return this.store[key];
    }
    set(key: string, val: any) {
      this.store[key] = val;
    }
    clear() {
      this.store = {};
    }
  },
}));

describe('ConfigService', () => {
  test('should load valid default config', () => {
    const svc = new ConfigService();
    expect(svc.get('version')).toBe(3);
    expect(svc.get('defaultPreset')).toBe('balanced');
  });

  test('should set valid values and reject invalid keys', () => {
    const svc = new ConfigService();
    svc.set('defaultPreset', 'highest-quality');
    expect(svc.get('defaultPreset')).toBe('highest-quality');
    expect(() => svc.set('invalidKey' as any, 'x')).toThrow(
      "Invalid configuration key: 'invalidKey'"
    );
  });

  test('should reject invalid types and enum values', () => {
    const svc = new ConfigService();
    expect(() => svc.set('outputPath', 123 as any)).toThrow('outputPath:');
    expect(() => svc.set('preferredBrowser', 'opera' as any)).toThrow(
      'preferredBrowser:'
    );
    expect(() =>
      svc.set('subtitleOptions', {
        mode: 'invalid-mode',
        output: 'embed',
      } as any)
    ).toThrow('subtitleOptions.mode:');
  });
});
