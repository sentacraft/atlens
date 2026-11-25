import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function checkDesignIndex(cwd) {
  const root = execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const git = (...args) => execFileSync('git', ['-c', 'core.fsmonitor=false', '-C', root, ...args], { encoding: 'utf8' });
  const blocked = ['.design', 'design'];
  const files = git('ls-files', '--full-name', '--cached', '-z').split('\0').filter(Boolean);
  const violations = files.filter(file => blocked.some(path => file === path || file.startsWith(`${path}/`)));
  if (violations.length) { throw new Error(`Private design paths are in Git index: ${violations.join(', ')}`); }
  if (!files.includes('.open-artifacts.json')) { throw new Error('Track .open-artifacts.json with cloud artifact URIs'); }
  const mapping = JSON.parse(git('show', ':.open-artifacts.json'));
  const fields = ['v', 'storage', 'canvas', 'designSystem'];
  if (Object.keys(mapping).some(key => !fields.includes(key))) { throw new Error('Cloud mapping must contain only version, storage and artifact URIs, not credentials'); }
  if (mapping.v !== 1 || mapping.storage !== 'remote') { throw new Error('Expected remote cloud mapping v1'); }
  for (const role of ['canvas', 'designSystem']) {
    if (typeof mapping[role] !== 'string' || !/^open-artifact:\/\/artifact\/art_[a-z0-9]+$/.test(mapping[role])) {
      throw new Error(`Expected a plain artifact URI for ${role}`);
    }
  }
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
