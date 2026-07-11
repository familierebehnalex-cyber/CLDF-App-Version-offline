'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname);
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.tsv': 'text/tab-separated-values; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
};
const compressible = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.txt', '.md', '.tsv', '.csv']);

function safeTarget(requestUrl) {
  let pathname;
  try { pathname = decodeURIComponent(String(requestUrl || '/').split('?')[0]); }
  catch { return null; }
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  const target = path.resolve(root, `.${pathname}`);
  return target === root || target.startsWith(`${root}${path.sep}`) ? target : null;
}

function sendFile(req, res, target) {
  fs.stat(target, (statError, stat) => {
    let file = target;
    if (!statError && stat.isDirectory()) file = path.join(target, 'index.html');
    fs.readFile(file, (error, data) => {
      if (error) {
        const acceptsHtml = String(req.headers.accept || '').includes('text/html');
        if (acceptsHtml && file !== path.join(root, 'index.html')) return sendFile(req, res, path.join(root, 'index.html'));
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Nicht gefunden');
        return;
      }
      const extension = path.extname(file).toLowerCase();
      const headers = {
        'Content-Type': types[extension] || 'application/octet-stream',
        'Cache-Control': /(?:index\.html|service-worker\.js|getinline-data\.js|getinline-dances\.json)$/.test(file) ? 'no-cache' : 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'microphone=(self), camera=(self)',
        'Cross-Origin-Opener-Policy': 'same-origin',
      };
      const accepted = String(req.headers['accept-encoding'] || '');
      if (compressible.has(extension) && data.length > 1024 && accepted.includes('gzip')) {
        zlib.gzip(data, { level: 6 }, (gzipError, compressed) => {
          if (gzipError) {
            res.writeHead(200, headers); res.end(data); return;
          }
          res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
          res.end(compressed);
        });
        return;
      }
      res.writeHead(200, headers);
      res.end(data);
    });
  });
}

http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
  }
  const target = safeTarget(req.url);
  if (!target) { res.writeHead(403); res.end('Forbidden'); return; }
  sendFile(req, res, target);
}).listen(port, '0.0.0.0', () => {
  console.log(`CLDF Offline läuft auf http://localhost:${port}`);
  console.log('Zum Beenden dieses Fenster schließen oder Strg+C drücken.');
});
