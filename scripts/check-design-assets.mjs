import { readFileSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function checkDesignIndex(cwd) {
  const git = (...args) => execFileSync('git', ['-c', 'core.fsmonitor=false', '-C', cwd, ...args], { encoding: 'utf8' });
  const root = git('rev-parse', '--show-toplevel').trim();
  const config = JSON.parse(readFileSync(resolve(root, '.open-artifacts.json'), 'utf8'));
  if (config.v !== 1) { throw new Error('Expected .open-artifacts.json v1'); }
  const extra = config.assetPrivacy === 'external-private' ? config.privateDesignPaths ?? [] : [];
  if (!Array.isArray(extra)) { throw new Error('privateDesignPaths must be an array'); }
  const blocked = ['.design', ...extra.map(value => {
    if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || posix.isAbsolute(value) || value.split('/').includes('..')) {
      throw new Error('Private design paths must be relative project paths');
    }
    const path = posix.normalize(value).replace(/\/$/, '');
    if (path === '.') { throw new Error('A private design path cannot be the project root'); }
    return path;
  })];
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
