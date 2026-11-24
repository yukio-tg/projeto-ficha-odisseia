import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../actual-development');
const port = Number(process.env.PORT) || 4173;

const rewrites = new Map([
  ['/favicon.ico', '/image/odisseia-logo.ico'],
  ['/ficha', '/ficha/ficha.html'],
  ['/wiki', '/wiki/index.html'],
  ['/wiki/doc', '/wiki/doc.html'],
  ['/wiki/criar', '/wiki/criar.html'],
  ['/wiki/editar', '/wiki/editar.html'],
]);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function safeFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const full = path.resolve(root, decoded.replace(/^\/+/, ''));
  if (!full.startsWith(root)) return null;
  return full;
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  if (rewrites.has(pathname)) pathname = rewrites.get(pathname);

  let file = safeFile(pathname);
  if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  const exists = file && fs.existsSync(file) && fs.statSync(file).isFile();
  if (!exists) {
    if (path.extname(pathname)) {
      send(res, 404, 'not found');
      return;
    }
    file = safeFile('/index.html');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      send(res, 500, 'read error');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html' && url.searchParams.get('layout') === '1') {
      const html = data.toString('utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      send(res, 200, html, types['.html']);
      return;
    }
    send(res, 200, data, types[ext] || 'application/octet-stream');
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`odisseia test http://127.0.0.1:${port}`);
});
