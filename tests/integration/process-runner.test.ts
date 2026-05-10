import { describe, expect, test } from 'bun:test';
import { BunProcessRunner } from '../../src/infrastructure/process/bun-process-runner';

describe('BunProcessRunner', () => {
  test('should run a command and capture stdout', async () => {
    const runner = new BunProcessRunner();
    const result = await runner.run('echo', ['hello']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
  });

  test('should capture stderr on failure', async () => {
    const runner = new BunProcessRunner();
    // Run a command that fails or produces stderr
    // "ls" with a non-existent file usually produces stderr
    const result = await runner.run('ls', ['non-existent-file']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toBeTruthy();
  });
});
