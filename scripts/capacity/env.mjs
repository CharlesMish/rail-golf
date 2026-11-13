import { execFileSync } from 'node:child_process';
import os from 'node:os';

export function gitSha() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}

export function machineEnv() {
  const cpus = os.cpus();
  return {
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    cpuModel: cpus[0]?.model ?? 'unknown',
    cores: cpus.length,
    cpuSpeedMHz: cpus[0]?.speed ?? null,
    memoryBytes: os.totalmem(),
    node: process.version,
  };
}

export function chromeVersion(binary = '/usr/bin/google-chrome-stable') {
  try { return execFileSync(binary, ['--version'], { encoding: 'utf8' }).trim(); }
  catch { return 'unavailable'; }
}
