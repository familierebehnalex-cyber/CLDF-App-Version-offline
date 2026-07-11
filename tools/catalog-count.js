'use strict';
const fs = require('node:fs');
const path = require('node:path');
try {
  const file = path.join(__dirname, '..', 'data', 'getinline-dances.json');
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(Number(payload.count || (Array.isArray(payload.dances) ? payload.dances.length : 0)) || 0);
} catch {
  console.log(0);
}
