const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createStore } = require('./db');

const PORT = Number(process.env.PORT || 3000);

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(__dirname, 'public', urlPath);

  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return true;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const type = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  return false;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function createServer(dbFile = process.env.DB_FILE || path.join(__dirname, 'data.json')) {
  const store = createStore(dbFile);

  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/api/posts') {
        return sendJson(res, 200, store.getPosts());
      }

      if (req.method === 'POST' && req.url === '/api/posts') {
        const body = await parseBody(req);
        const { username, avatarUrl, imageUrl, caption } = body;

        if (!username || !avatarUrl || !imageUrl || !caption) {
          return sendJson(res, 400, {
            error: 'username, avatarUrl, imageUrl and caption are required',
          });
        }

        const post = store.createPost({
          username: String(username).trim(),
          avatarUrl: String(avatarUrl).trim(),
          imageUrl: String(imageUrl).trim(),
          caption: String(caption).trim(),
        });

        return sendJson(res, 201, post);
      }

      const likeMatch = req.url.match(/^\/api\/posts\/(\d+)\/like$/);
      if (req.method === 'POST' && likeMatch) {
        const post = store.likePost(Number(likeMatch[1]));
        if (!post) return sendJson(res, 404, { error: 'Post not found' });
        return sendJson(res, 200, post);
      }

      const commentMatch = req.url.match(/^\/api\/posts\/(\d+)\/comments$/);
      if (req.method === 'POST' && commentMatch) {
        const body = await parseBody(req);
        const { username, text } = body;
        if (!username || !text) {
          return sendJson(res, 400, { error: 'username and text are required' });
        }

        const comment = store.addComment(Number(commentMatch[1]), String(username).trim(), String(text).trim());
        if (!comment) return sendJson(res, 404, { error: 'Post not found' });

        return sendJson(res, 201, comment);
      }

      if (req.method === 'GET' && serveStatic(req, res)) {
        return;
      }

      if (req.method === 'GET') {
        req.url = '/index.html';
        if (serveStatic(req, res)) return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Bad request' });
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Insta clone is running on http://localhost:${PORT}`);
  });
}

module.exports = { createServer };
