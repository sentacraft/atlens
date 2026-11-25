import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkDesignIndex } from './check-design-assets.mjs';

const mapping = { v: 1, storage: 'remote', canvas: 'open-artifact://artifact/art_canvas', designSystem: 'open-artifact://artifact/art_system' };
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'design-privacy-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init', '-q');
  writeFileSync(join(root, '.gitignore'), '/.design\n/design\n');
  writeFileSync(join(root, '.open-artifacts.json'), JSON.stringify(mapping));
  git('add', '.open-artifacts.json');
  return { root, git };
}

test('tracked cloud pointers and ordinary source pass without private assets or authorization', t => {
  const { root, git } = fixture(t);
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src/tokens.json'), '{}');
  git('add', 'src/tokens.json');
  assert.deepEqual(checkDesignIndex(root), { trackedPrivatePaths: 0 });
  assert.deepEqual(checkDesignIndex(join(root, 'src')), { trackedPrivatePaths: 0 });
});

test('force-added private binding contents are rejected', t => {
  const { root, git } = fixture(t);
  mkdirSync(join(root, '.design'));
  writeFileSync(join(root, '.design/private.txt'), 'private');
  git('add', '-f', '.design/private.txt');
  assert.throws(() => checkDesignIndex(root), /Private design paths/);
});

test('force-added private design sources are rejected', t => {
  const { root, git } = fixture(t);
  mkdirSync(join(root, 'design'));
  writeFileSync(join(root, 'design/canvas.json'), '{}');
  git('add', '-f', 'design/canvas.json');
  assert.throws(() => checkDesignIndex(root), /design\/canvas.json/);
});

test('credentials in the staged mapping are rejected despite clean working-tree edits', t => {
  const { root, git } = fixture(t);
  writeFileSync(join(root, '.open-artifacts.json'), JSON.stringify({ ...mapping, token: 'not-a-real-token' }));
  git('add', '.open-artifacts.json');
  writeFileSync(join(root, '.open-artifacts.json'), JSON.stringify(mapping));
  assert.throws(() => checkDesignIndex(root), /not credentials/);
});

test('share URLs with access tokens and local design paths are rejected', t => {
  const { root, git } = fixture(t);
  for (const canvas of ['https://example.invalid/a/id?token=example', 'design/canvas', mapping.canvas + '?token=example']) {
    writeFileSync(join(root, '.open-artifacts.json'), JSON.stringify({ ...mapping, canvas }));
    git('add', '.open-artifacts.json');
    assert.throws(() => checkDesignIndex(root), /plain artifact URI/);
  }
});

test('the mapping must be tracked for a fresh clone', t => {
  const { root, git } = fixture(t);
  git('rm', '--cached', '.open-artifacts.json');
  assert.throws(() => checkDesignIndex(root), /Track .open-artifacts.json/);
});
