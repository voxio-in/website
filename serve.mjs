// serve.mjs — dependency-free static server.
// ES modules require HTTP; file:// will not work.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, NOT .pathname — .pathname leaves spaces percent-encoded and
// every request 404s if the folder name contains a space.
const ROOT = fileURLToPath(new URL('.', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
};

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/index.html';

    const filePath = normalize(join(ROOT, pathname));

    // directory-traversal guard
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }

    const body = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';

    // Content-Length and Accept-Ranges are required for media: without an explicit
    // length Node falls back to chunked transfer-encoding, and Chrome's video
    // pipeline stalls at readyState 0 rather than erroring.
    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m) {
        const start = m[1] ? Number(m[1]) : 0;
        const end = m[2] ? Number(m[2]) : body.length - 1;
        if (start <= end && end < body.length) {
          const slice = body.subarray(start, end + 1);
          res.writeHead(206, {
            'Content-Type': type,
            'Content-Length': slice.length,
            'Content-Range': `bytes ${start}-${end}/${body.length}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store',
          });
          res.end(slice);
          return;
        }
      }
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': body.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  }
});

const port = Number(process.env.PORT) || 8123;
server.listen(port, '127.0.0.1', () => {
  console.log(`serving on http://127.0.0.1:${port}`);
});
