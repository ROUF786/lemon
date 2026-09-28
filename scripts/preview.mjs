#!/usr/bin/env node
/**
 * Bagawan Brothers — preview the website on this computer AND on your phone.
 * Run it by double-clicking  preview.bat  (or: npm run preview)
 * Your phone must be on the same Wi-Fi. Press Ctrl+C (or close the window) to stop.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { p = '/'; }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, path.normalize(p).replace(/^[/\\]+/, ''));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
});

const lanAddresses = () => Object.values(os.networkInterfaces()).flat()
  .filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);

const start = (port) => {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && port < 5199) start(port + 1);
    else { console.error('  Could not start the preview:', e.message); process.exit(1); }
  });
  server.listen(port, '0.0.0.0', () => {
    const local = `http://localhost:${port}`;
    console.log('\n  Bagawan Brothers — preview is running\n');
    console.log(`  On this computer:  ${local}`);
    for (const ip of lanAddresses()) console.log(`  On your phone:     http://${ip}:${port}   (same Wi-Fi)`);
    console.log('\n  If Windows asks about the firewall, click "Allow" so your phone can open it.');
    console.log('  Close this window to stop.\n');
    if (!process.env.NO_OPEN) {
      const cmd = process.platform === 'win32' ? `start "" "${local}"` : process.platform === 'darwin' ? `open "${local}"` : `xdg-open "${local}"`;
      exec(cmd, () => {});
    }
  });
};
start(Number(process.env.PORT) || 5173);
