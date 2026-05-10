export interface ProcessSpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export interface ProcessExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}
