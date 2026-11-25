import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkDesignIndex } from './check-design-assets.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'design-privacy-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init', '-q');
  writeFileSync(join(root, '.gitignore'), '/.open-artifacts.json\n/.design\n/design\n');
  return { root, git };
}

test('ordinary source files pass without private assets or registry', t => {
  const { root, git } = fixture(t);
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src/tokens.json'), '{}');
  git('add', 'src/tokens.json');
  assert.deepEqual(checkDesignIndex(root), { trackedPrivatePaths: 0 });
});

test('force-added binding contents are rejected', t => {
  const { root, git } = fixture(t);
  mkdirSync(join(root, '.design'));
  writeFileSync(join(root, '.design/private.txt'), 'private');
  git('add', '-f', '.design/private.txt');
  assert.throws(() => checkDesignIndex(root), /Private design paths/);
});

test('force-added legacy design sources are rejected', t => {
  const { root, git } = fixture(t);
  mkdirSync(join(root, 'design'));
  writeFileSync(join(root, 'design/canvas.json'), '{}');
  git('add', '-f', 'design/canvas.json');
  assert.throws(() => checkDesignIndex(root), /design\/canvas.json/);
});

test('force-added private cloud mappings are rejected', t => {
  const { root, git } = fixture(t);
  writeFileSync(join(root, '.open-artifacts.json'), JSON.stringify({ v: 1, storage: 'remote' }));
  git('add', '-f', '.open-artifacts.json');
  assert.throws(() => checkDesignIndex(root), /\.open-artifacts\.json/);
});

test('the public example passes without a local mapping', t => {
  const { root, git } = fixture(t);
  writeFileSync(join(root, '.open-artifacts.example.json'), JSON.stringify({ v: 1, storage: 'remote' }));
  git('add', '.open-artifacts.example.json');
  assert.deepEqual(checkDesignIndex(root), { trackedPrivatePaths: 0 });
});
