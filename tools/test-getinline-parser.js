'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseDancePage, parseDirectoryIndex } = require('./getinline-lib');

const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'getinline-sample.html'), 'utf8');
const result = parseDancePage(html, 'https://www.get-in-line.de/dances/Only%20Me_-_Jacobson.htm');
assert.equal(result.title, 'Only Me');
assert.equal(result.choreographer, 'Ole Jacobson & Nina K.');
assert.equal(result.counts, 32);
assert.equal(result.walls, 4);
assert.equal(result.level, 'improver');
assert.equal(result.restarts, 4);
assert.equal(result.tags, 0);
assert.deepEqual(result.music, [{ title: 'Only Me', artist: 'Kip Moore' }]);
assert.equal(result.publishedYear, 2025);
assert.equal(result.sheetUrl, 'https://www.get-in-line.de/dances/Only%20Me_-_Jacobson.htm');
assert.ok(!JSON.stringify(result).includes('Schrittbeschreibung, die nicht übernommen'));

const index = '<a href="Only%20Me_-_Jacobson.htm">Only Me</a><a href="City%20of%20Music_-_Fillion-Villellas.htm">City</a>';
assert.equal(parseDirectoryIndex(index).length, 2);
console.log('Get-in-Line-Parser: alle Tests bestanden.');
