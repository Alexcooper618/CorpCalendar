import * as assert from 'node:assert/strict';
import { parseDepartmentTree } from '../src/audiences/departments.utils';

function testSplitsAndNormalizes() {
  const nodes = parseDepartmentTree(['Corp \\\\ Division \\\\ Team']);

  assert.equal(nodes.length, 3);
  assert.deepEqual(nodes[0], { name: 'Corp', path: 'Corp', parentPath: undefined });
  assert.deepEqual(nodes[1], {
    name: 'Division',
    path: 'Corp/Division',
    parentPath: 'Corp',
  });
  assert.deepEqual(nodes[2], {
    name: 'Team',
    path: 'Corp/Division/Team',
    parentPath: 'Corp/Division',
  });
}

function testDeduplicatesNodes() {
  const nodes = parseDepartmentTree([' Company \\\\ Sales ', 'Company \\\\ Sales \\\\ B2B']);

  assert.equal(nodes.length, 3);
  assert.deepEqual(nodes[0], {
    name: 'Company',
    path: 'Company',
    parentPath: undefined,
  });
  assert.deepEqual(nodes[1], { name: 'Sales', path: 'Company/Sales', parentPath: 'Company' });
  assert.deepEqual(nodes[2], {
    name: 'B2B',
    path: 'Company/Sales/B2B',
    parentPath: 'Company/Sales',
  });
}

function testIgnoresEmpty() {
  const nodes = parseDepartmentTree(['', '   ', '\\\\OnlyOne\\\\', null as unknown as string]);

  assert.equal(nodes.length, 1);
  assert.deepEqual(nodes[0], { name: 'OnlyOne', path: 'OnlyOne', parentPath: undefined });
}

function run() {
  testSplitsAndNormalizes();
  testDeduplicatesNodes();
  testIgnoresEmpty();
  // eslint-disable-next-line no-console
  console.log('Department parser tests passed');
}

run();
