import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setup, sessionCwd, runtimeIdentity } from './worktree-setup.mjs';

const script = new URL('./worktree-setup.mjs', import.meta.url).pathname;
function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'atlens setup ')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', root]);
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ packageManager: 'pnpm@10.14.0' }));
  writeFileSync(path.join(root, '.nvmrc'), runtimeIdentity().nodeMajor);
  writeFileSync(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  const calls = [];
  const execute = (cmd, args, cwd) => {
    assert.equal(cmd, 'pnpm');
    assert.equal(cwd, root);
    if (args[0] === '--version') {
      return '10.14.0';
    }
    calls.push(args);
    mkdirSync(path.join(root, 'node_modules'), { recursive: true });
    writeFileSync(path.join(root, 'node_modules/.modules.yaml'), 'packageManager: pnpm@10.14.0\n');
  };
  return { root, calls, execute, options: { cwd: root, execute } };
}

test('installs once with frozen lockfile; package and lock content changes reinstall', (t) => {
  const f = fixture(t);
  setup(f.options);
  setup(f.options);
  assert.deepEqual(f.calls, [['install', '--frozen-lockfile']]);
  writeFileSync(path.join(f.root, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n# changed\n');
  setup(f.options);
  writeFileSync(path.join(f.root, 'package.json'), JSON.stringify({ packageManager: 'pnpm@10.14.0', name: 'changed' }));
  setup(f.options);
  assert.equal(f.calls.length, 3);
});

test('cache-only node_modules does not count as installed', (t) => {
  const f = fixture(t);
  mkdirSync(path.join(f.root, 'node_modules/.cache'), { recursive: true });
  setup(f.options);
  assert.equal(f.calls.length, 1);
});

test('check never installs or creates dependency state', (t) => {
  const f = fixture(t);
  assert.throws(() => setup({ ...f.options, check: true }), /need installation/);
  assert.equal(f.calls.length, 0);
  assert.throws(() => readFileSync(path.join(f.root, 'node_modules/.atlens-setup.json')), /ENOENT/);
});

test('rejects unknown existing dependencies without modifying them', (t) => {
  const f = fixture(t);
  f.execute('pnpm', ['install'], f.root);
  const marker = path.join(f.root, 'node_modules/.modules.yaml');
  const before = readFileSync(marker, 'utf8');
  assert.throws(() => setup(f.options), /no setup identity/);
  assert.equal(readFileSync(marker, 'utf8'), before);
  assert.equal(f.calls.length, 1);
});

test('rejects cross-platform dependency reuse and node/pnpm mismatch', (t) => {
  const f = fixture(t);
  setup(f.options);
  const runtime = { ...runtimeIdentity(), platform: runtimeIdentity().platform === 'darwin' ? 'linux' : 'darwin' };
  assert.throws(() => setup({ ...f.options, runtime }), /environment mismatch/);
  assert.throws(() => setup({ ...f.options, runtime: { ...runtimeIdentity(), nodeMajor: '0' } }), /Node .* required/);
  assert.throws(() => setup({ ...f.options, execute: () => '0.0.0' }), /pnpm .* required/);
  assert.equal(f.calls.length, 1);
});

test('accepts an exact Node version and rejects a different patch', (t) => {
  const f = fixture(t);
  writeFileSync(path.join(f.root, '.nvmrc'), `${process.versions.node}\n`);
  assert.match(setup(f.options), /installed/);
  writeFileSync(path.join(f.root, '.nvmrc'), `${runtimeIdentity().nodeMajor}.0.999\n`);
  assert.throws(() => setup(f.options), /Node .* required/);
  assert.equal(f.calls.length, 1);
});

test('rejects symlinked node_modules and install marker', (t) => {
  const f = fixture(t);
  const target = path.join(f.root, 'shared');
  mkdirSync(target);
  symlinkSync(target, path.join(f.root, 'node_modules'));
  assert.throws(() => setup(f.options), /symlinked/);
  rmSync(path.join(f.root, 'node_modules'));
  mkdirSync(path.join(f.root, 'node_modules'));
  writeFileSync(path.join(target, 'marker'), 'original');
  symlinkSync(path.join(target, 'marker'), path.join(f.root, 'node_modules/.modules.yaml'));
  assert.throws(() => setup(f.options), /symlinked/);
  assert.equal(readFileSync(path.join(target, 'marker'), 'utf8'), 'original');
});

test('failed install remains unready and retry succeeds', (t) => {
  const f = fixture(t);
  const execute = (cmd, args, cwd) => {
    if (args[0] === 'install') {
      throw new Error('simulated install failure');
    }
    return f.execute(cmd, args, cwd);
  };
  assert.throws(() => setup({ ...f.options, execute }), /simulated/);
  assert.throws(() => setup({ ...f.options, check: true }), /need installation/);
  setup(f.options);
  assert.match(setup({ ...f.options, check: true }), /ready/);
});

test('concurrent installer lock prevents writes', (t) => {
  const f = fixture(t);
  mkdirSync(path.join(f.root, '.git/atlens-setup.lock'));
  assert.throws(() => setup(f.options), /already running/);
  assert.equal(f.calls.length, 0);
});

test('changed pnpm marker requires reinstall', (t) => {
  const f = fixture(t);
  setup(f.options);
  writeFileSync(path.join(f.root, 'node_modules/.modules.yaml'), 'modified externally');
  assert.throws(() => setup({ ...f.options, check: true }), /need installation/);
  setup(f.options);
  assert.equal(f.calls.length, 2);
});

test('Claude uses JSON cwd, not launcher cwd or CLAUDE_PROJECT_DIR', (t) => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, [script, '--claude-hook'], {
    cwd: os.tmpdir(), encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: '/not-the-target' },
    input: JSON.stringify({ cwd: f.root }),
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.match(output.hookSpecificOutput.additionalContext, /Main checkout/);
  assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(f.calls.length, 0);
});

test('Claude installs into a real worktree even when launched from main checkout', (t) => {
  const f = fixture(t);
  const git = (...args) => execFileSync('git', ['-C', f.root, '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args]);
  git('add', '--force', 'package.json', '.nvmrc', 'pnpm-lock.yaml');
  git('-c', 'user.name=Setup Test', '-c', 'user.email=setup@example.invalid', 'commit', '-qm', 'fixture');
  const worktree = path.join(f.root, 'worktree with spaces');
  git('worktree', 'add', '--detach', worktree);
  const bin = path.join(f.root, 'fake-bin');
  mkdirSync(bin);
  const fakePnpm = path.join(bin, 'pnpm');
  writeFileSync(fakePnpm, '#!/bin/sh\nset -eu\nif [ "$1" = "--version" ]; then printf "10.14.0\\n"; exit 0; fi\n[ "$1" = "install" ] && [ "$2" = "--frozen-lockfile" ]\nmkdir -p node_modules\nprintf "fake marker\\n" > node_modules/.modules.yaml\nprintf "fake pnpm install log\\n"\n');
  chmodSync(fakePnpm, 0o700);
  const result = spawnSync(process.execPath, [script, '--claude-hook'], {
    cwd: f.root, encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, CLAUDE_PROJECT_DIR: f.root },
    input: JSON.stringify({ cwd: worktree }),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /Dependencies installed/);
  assert.match(result.stderr, /fake pnpm install log/);
  assert.equal(JSON.parse(readFileSync(path.join(worktree, 'node_modules/.atlens-setup.json'), 'utf8')).identity.platform, process.platform);
  assert.throws(() => readFileSync(path.join(f.root, 'node_modules/.atlens-setup.json')), /ENOENT/);
});

test('Claude invalid input warns the model instead of guessing cwd', () => {
  assert.throws(() => sessionCwd('{}'), /absolute cwd/);
  assert.throws(() => sessionCwd('{"cwd":"relative"}'), /absolute cwd/);
  const result = spawnSync(process.execPath, [script, '--claude-hook'], { input: '{}', encoding: 'utf8' });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.match(output.systemMessage, /setup failed/);
  assert.match(output.hookSpecificOutput.additionalContext, /Do not run/);
});
