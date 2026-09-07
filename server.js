const http = require('http');
const fs = require('fs');
const path = require('path');

// Porta alterada para 5173 (livre e padrão de desenvolvimento)
let currentPort = parseInt(process.env.PORT, 10) || 5173;
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  // Default to index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // Candidate paths to search
  let candidatePaths = [];

  if (pathname === '/index.html') {
    candidatePaths.push(path.join(ROOT_DIR, 'index.html'));
  } else if (pathname.startsWith('/hero-frames/')) {
    candidatePaths.push(path.join(PUBLIC_DIR, pathname));
    candidatePaths.push(path.join(PUBLIC_DIR, 'hero-frames', pathname.replace('/hero-frames/', '')));
  } else if (pathname.startsWith('/planning-frames/')) {
    candidatePaths.push(path.join(PUBLIC_DIR, pathname));
    candidatePaths.push(path.join(PUBLIC_DIR, 'planning-frames', pathname.replace('/planning-frames/', '')));
    if (pathname.includes('/frame_')) {
      candidatePaths.push(path.join(PUBLIC_DIR, 'planning-frames', pathname.replace('/planning-frames/frame_', 'planning_frame_')));
    }
  } else if (pathname.startsWith('/public/')) {
    candidatePaths.push(path.join(ROOT_DIR, pathname));
  } else {
    candidatePaths.push(path.join(PUBLIC_DIR, pathname));
    candidatePaths.push(path.join(ROOT_DIR, pathname));
  }

  let filePath = null;
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      filePath = candidate;
      break;
    }
  }

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 Not Found: ${pathname}`);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range && (ext === '.mp4' || ext === '.webm')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️  Porta ${currentPort} ocupada, tentando ${currentPort + 1}...`);
    currentPort++;
    startServer(currentPort);
  } else {
    console.error('Server error:', err);
  }
});

function startServer(port) {
  server.listen(port, () => {
    console.log('====================================================');
    console.log(' ✨ Aurea Implant Architecture - Dev Server');
    console.log(` 🌐 Local:   http://localhost:${port}`);
    console.log(' 📁 Servindo: index.html & public/hero-frames');
    console.log('====================================================');
  });
}

startServer(currentPort);
