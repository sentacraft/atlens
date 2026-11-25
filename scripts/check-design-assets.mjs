import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function checkDesignIndex(cwd) {
  const git = (...args) => execFileSync('git', ['-c', 'core.fsmonitor=false', '-C', cwd, ...args], { encoding: 'utf8' });
  // The guard must work in CI without the ignored personal mapping.
  const blocked = ['.open-artifacts.json', '.design', 'design'];
  const files = git('ls-files', '--cached', '-z').split('\0').filter(Boolean);
  const violations = files.filter(file => blocked.some(path => file === path || file.startsWith(`${path}/`)));
  if (violations.length) { throw new Error(`Private design paths are in Git index: ${violations.join(', ')}`); }
  return { trackedPrivatePaths: 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify({ ok: true, ...checkDesignIndex(process.cwd()) }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Design privacy check failed');
    process.exitCode = 1;
  }
}
