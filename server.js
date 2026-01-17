#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

const rootDir = path.resolve(__dirname);

function showUsage() {
  console.log('Usage: node server.js [--port=<number>] [--silent]');
  console.log('Options:');
  console.log('  --port=<number>  Port to listen on (defaults to 3000 or the PORT env var)');
  console.log('  --silent         Disable request logging');
  console.log('  -h, --help       Show this help message');
}

function parsePort(value) {
  if (!value) {
    return null;
  }

  const portNumber = Number.parseInt(value, 10);
  if (!Number.isInteger(portNumber) || portNumber <= 0 || portNumber > 65535) {
    return null;
  }

  return portNumber;
}

let port = parsePort(process.env.PORT) || 3000;
let silent = false;

for (const arg of process.argv.slice(2)) {
  if (arg === '-h' || arg === '--help') {
    showUsage();
    process.exit(0);
  } else if (arg.startsWith('--port=')) {
    const value = arg.split('=')[1];
    const parsed = parsePort(value);
    if (parsed === null) {
      console.error('Invalid port: ' + value);
      process.exit(1);
    }
    port = parsed;
  } else if (arg === '--silent') {
    silent = true;
  } else {
    console.error('Unknown argument: ' + arg);
    showUsage();
    process.exit(1);
  }
}

function sendText(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(message + '\n');
}

function serveFile(filePath, stats, req, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || 'application/octet-stream';

  res.statusCode = 200;
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      sendText(res, 500, 'Internal Server Error');
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.httpVersionMajor < 1) {
    sendText(res, 505, 'HTTP Version Not Supported');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch (error) {
    sendText(res, 400, 'Bad Request');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch (error) {
    sendText(res, 400, 'Bad Request');
    return;
  }

  const displayPath = requestUrl.pathname || '/';
  res.on('finish', () => {
    if (!silent) {
      const now = new Date().toISOString();
      console.log(`[${now}] ${req.method} ${displayPath} -> ${res.statusCode}`);
    }
  });

  let relativePath = pathname;
  if (relativePath.endsWith('/')) {
    relativePath += 'index.html';
  }
  relativePath = relativePath.replace(/^\/+/, '');

  if (relativePath === '') {
    relativePath = 'index.html';
  }

  const normalizedPath = path.normalize(relativePath);
  const safePath = path.join(rootDir, normalizedPath);

  if (!safePath.startsWith(rootDir)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.stat(safePath, (statError, stats) => {
    if (statError) {
      if (statError.code === 'ENOENT') {
        sendText(res, 404, 'Not Found');
      } else {
        sendText(res, 500, 'Internal Server Error');
      }
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(safePath, 'index.html');
      fs.stat(indexPath, (indexError, indexStats) => {
        if (indexError || !indexStats.isFile()) {
          sendText(res, 403, 'Forbidden');
          return;
        }
        serveFile(indexPath, indexStats, req, res);
      });
      return;
    }

    if (!stats.isFile()) {
      sendText(res, 403, 'Forbidden');
      return;
    }

    serveFile(safePath, stats, req, res);
  });
});

server.on('error', (error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

server.listen(port, () => {
  if (!silent) {
    console.log(`Serving ${rootDir} at http://localhost:${port}`);
  }
});

process.on('SIGINT', () => {
  if (!silent) {
    console.log('\nShutting down server...');
  }
  server.close(() => process.exit(0));
});
