/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { ConfigService } from '../../src/core/config/config.service';
import { AppConfigSchema } from '../../src/core/config/config-schema';
import { DEFAULT_CONFIG } from '../../src/core/config/default-config';
import Conf from 'conf';

// Mock Conf module to control what is loaded from file
mock.module('conf', () => {
  return {
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
  };
});

describe('ConfigService', () => {
  beforeEach(() => {
    // Reset/clear any mocks or storage if needed
  });

  test('should load valid default config successfully', () => {
    const configService = new ConfigService();
    expect(configService.get('version')).toBe(2);
    expect(configService.get('defaultPreset')).toBe('balanced');
    expect(configService.get('preferredVideoQuality')).toBe('best');
  });

  test('should allow setting valid configuration values', () => {
    const configService = new ConfigService();
    configService.set('defaultPreset', 'highest-quality');
    expect(configService.get('defaultPreset')).toBe('highest-quality');

    configService.set('preferredBrowser', 'chrome');
    expect(configService.get('preferredBrowser')).toBe('chrome');
  });

  test('should reject invalid configuration keys', () => {
    const configService = new ConfigService();
    expect(() => {
      configService.set('invalidKey' as any, 'value');
    }).toThrow("Invalid configuration key: 'invalidKey'");
  });

  test('should reject invalid types for known keys', () => {
    const configService = new ConfigService();
    expect(() => {
      configService.set('useDownloadArchive', 'not-a-boolean' as any);
    }).toThrow('useDownloadArchive:');
  });

  test('should reject invalid enum values for preferredBrowser', () => {
    const configService = new ConfigService();
    expect(() => {
      configService.set('preferredBrowser', 'opera' as any);
    }).toThrow('preferredBrowser:');
  });

  test('should reject invalid values in nested objects like subtitleOptions', () => {
    const configService = new ConfigService();
    expect(() => {
      configService.set('subtitleOptions', {
        mode: 'invalid-mode',
        output: 'embed',
      } as any);
    }).toThrow('subtitleOptions.mode:');
  });
});
