import fs from 'node:fs/promises';
import path from 'node:path';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ico': 'image/x-icon',
};

export function publicPath(url) {
  const pathname = decodeURIComponent(url.split('?')[0]);
  if (!pathname.startsWith('/') || pathname.includes('\\') || /[\u0000-\u001f]/.test(pathname) || pathname.split('/').some(part => part === '..' || part === '.')) return null;
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (['index.html', 'app.js', 'style.css'].includes(relative)) return relative;
  if (/^(game|framework\/src)\/(?:[\w-]+\/)*[\w-]+\.js$/.test(relative)) return relative;
  if (/^assets\/(?:[\w-]+\/)*[\w .-]+\.(png|jpg|jpeg|gif|webp|svg|wav|mp3|ogg|ico)$/i.test(relative)) return relative;
  return null;
}

export function createStaticHandler(root) {
  const rootPath = fs.realpath(root);
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      res.writeHead(405).end('Method not allowed');
      return;
    }
    try {
      const relative = publicPath(req.url || '/');
      if (!relative) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const canonicalRoot = await rootPath;
      const filePath = await fs.realpath(path.join(canonicalRoot, relative));
      const withinRoot = path.relative(canonicalRoot, filePath);
      if (withinRoot.startsWith('..' + path.sep) || withinRoot === '..' || path.isAbsolute(withinRoot)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const content = await fs.readFile(filePath);
      res.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
      res.setHeader('Content-Length', content.length);
      res.writeHead(200).end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      const status = error instanceof URIError ? 400 : ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) ? 404 : 500;
      res.writeHead(status).end(status === 400 ? 'Invalid URL' : status === 404 ? 'File not found' : 'Server error');
    }
  };
}
