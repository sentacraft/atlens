import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function run(command, args, cwd, inherit = false) {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', stdio: inherit ? ['ignore', 2, 2] : 'pipe',
    timeout: inherit ? 480000 : 15000,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.error?.message || result.stderr?.trim() || result.status}`);
  }
  return result.stdout?.trim();
}

function git(cwd, ...args) {
  return run('git', ['-c', 'core.fsmonitor=false', ...args], cwd);
}

function assertLocal(file) {
  try {
    if (lstatSync(file).isSymbolicLink()) {
      throw new Error(`Refusing shared/symlinked dependency state: ${file}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export function runtimeIdentity() {
  const header = process.platform === 'linux' ? process.report.getReport().header : {};
  return {
    platform: process.platform, arch: process.arch,
    libc: process.platform === 'linux' ? (header.glibcVersionRuntime ? 'glibc' : 'musl') : null,
    nodeMajor: process.versions.node.split('.')[0], abi: process.versions.modules,
  };
}

export function inputDigest(root) {
  const hash = createHash('sha256');
  for (const name of ['package.json', 'pnpm-lock.yaml', '.nvmrc', '.npmrc', 'pnpm-workspace.yaml', '.pnpmfile.cjs']) {
    const file = path.join(root, name);
    hash.update(name + '\0');
    hash.update(existsSync(file) ? readFileSync(file) : '<absent>');
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function setup({ cwd = process.cwd(), check = false, hook = false, runtime = runtimeIdentity(), execute = run } = {}) {
  const root = realpathSync(git(cwd, 'rev-parse', '--show-toplevel'));
  const gitDir = realpathSync(git(root, 'rev-parse', '--absolute-git-dir'));
  const commonDir = realpathSync(path.resolve(root, git(root, 'rev-parse', '--git-common-dir')));
  if (hook && gitDir === commonDir) {
    return 'Main checkout: automatic installation skipped; use node scripts/worktree-setup.mjs --check to inspect it.';
  }
  if (!['darwin', 'linux'].includes(runtime.platform)) {
    throw new Error('This project setup supports macOS and Linux only.');
  }
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const nodeMajor = readFileSync(path.join(root, '.nvmrc'), 'utf8').trim();
  if (runtime.nodeMajor !== nodeMajor) {
    throw new Error(`Node ${nodeMajor} required; found Node ${runtime.nodeMajor}. Select the project runtime without replacing system Node.`);
  }
  const expectedPnpm = /^pnpm@(\d+\.\d+\.\d+)$/.exec(pkg.packageManager)?.[1];
  if (!expectedPnpm) {
    throw new Error('packageManager must pin an exact pnpm version.');
  }
  const pnpm = execute('pnpm', ['--version'], root);
  if (pnpm !== expectedPnpm) {
    throw new Error(`pnpm ${expectedPnpm} required; found ${pnpm || 'no version'}. No runtime or package manager was installed.`);
  }
  if (!existsSync(path.join(root, 'pnpm-lock.yaml'))) {
    throw new Error('Missing pnpm-lock.yaml; refusing an unlocked install.');
  }
  const lock = path.join(gitDir, 'atlens-setup.lock');
  if (existsSync(lock)) {
    throw new Error('Setup is already running or left a lock. Do not remove it until the previous installer has stopped.');
  }
  const modules = path.join(root, 'node_modules');
  const marker = path.join(modules, '.modules.yaml');
  const stamp = path.join(modules, '.atlens-setup.json');
  for (const file of [modules, path.join(modules, '.pnpm'), marker, stamp]) {
    assertLocal(file);
  }
  const identity = { v: 1, ...runtime, pnpm };
  const digest = inputDigest(root);
  let previous;
  if (existsSync(stamp)) {
    previous = JSON.parse(readFileSync(stamp, 'utf8'));
    if (JSON.stringify(previous.identity) !== JSON.stringify(identity)) {
      throw new Error('Dependency environment mismatch. Use a separate worktree for this OS/runtime; existing dependencies were not changed.');
    }
  } else if (existsSync(marker) || existsSync(path.join(modules, '.pnpm')) || existsSync(path.join(modules, '.bin'))) {
    throw new Error('Existing dependencies have no setup identity. They were not changed. Use a fresh worktree or manually move node_modules aside before setup.');
  }
  if (existsSync(marker) && previous?.digest === digest && previous?.modulesDigest === createHash('sha256').update(readFileSync(marker)).digest('hex')) {
    return 'Dependencies ready: platform, runtime, package inputs and pnpm install marker match.';
  }
  if (check) {
    throw new Error('Dependencies need installation; --check did not change any files. Run node scripts/worktree-setup.mjs.');
  }
  try {
    mkdirSync(lock);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error('Setup is already running or left a lock. Do not remove it until the previous installer has stopped.');
    }
    throw error;
  }
  try {
    // Invalidate readiness before installation; a failed install must never look ready.
    mkdirSync(modules, { recursive: true });
    writeFileSync(stamp, JSON.stringify({ identity, digest: null }) + '\n', { mode: 0o600 });
    execute('pnpm', ['install', '--frozen-lockfile'], root, true);
    if (!existsSync(marker)) {
      throw new Error('pnpm exited without an install marker; dependency readiness was not recorded.');
    }
    if (inputDigest(root) !== digest) {
      throw new Error('Package inputs changed during installation; run setup again.');
    }
    writeFileSync(stamp, JSON.stringify({ identity, digest, modulesDigest: createHash('sha256').update(readFileSync(marker)).digest('hex') }) + '\n', { mode: 0o600 });
    return 'Dependencies installed with the frozen lockfile and recorded for this platform/runtime.';
  } finally {
    rmdirSync(lock);
  }
}

export function sessionCwd(input) {
  const event = JSON.parse(input);
  if (typeof event.cwd !== 'string' || !path.isAbsolute(event.cwd)) {
    throw new Error('SessionStart requires an absolute cwd in its JSON input; refusing to guess the target checkout.');
  }
  return event.cwd;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const hook = args.includes('--claude-hook');
  let message;
  let failed = false;
  try {
    if (args.some((arg) => !['--check', '--claude-hook'].includes(arg))) {
      throw new Error('Usage: node scripts/worktree-setup.mjs [--check] [--claude-hook]');
    }
    const cwd = hook ? sessionCwd(readFileSync(0, 'utf8')) : process.cwd();
    message = setup({ cwd, hook, check: args.includes('--check') });
  } catch (error) {
    failed = true;
    message = `Project setup failed: ${error.message} Do not run build/test/dev until setup succeeds.`;
  }
  if (hook) {
    console.log(JSON.stringify({
      ...(failed ? { systemMessage: message } : {}),
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: message },
    }));
  } else {
    console[failed ? 'error' : 'log'](message);
  }
  process.exitCode = failed && !hook ? 1 : 0;
}
