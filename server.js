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
    const typeMap = {
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.html': 'text/html',
      '.json': 'application/json',
    };
    res.writeHead(200, { 'Content-Type': typeMap[ext] || 'application/octet-stream' });
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

function getQueryValue(reqUrl, key) {
  const requestUrl = new URL(reqUrl, 'http://localhost');
  return requestUrl.searchParams.get(key) || '';
}

function createServer(dbFile = process.env.DB_FILE || path.join(__dirname, 'data.json')) {
  const store = createStore(dbFile);

  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url.startsWith('/api/posts')) {
        const viewer = getQueryValue(req.url, 'viewer');
        return sendJson(res, 200, store.getPosts(viewer));
      }

      if (req.method === 'GET' && req.url.startsWith('/api/explore')) {
        const query = getQueryValue(req.url, 'q');
        const tag = getQueryValue(req.url, 'tag');
        const viewer = getQueryValue(req.url, 'viewer');
        return sendJson(res, 200, store.explore(query, tag, viewer));
      }

      if (req.method === 'GET' && req.url.startsWith('/api/feed/')) {
        const username = decodeURIComponent(req.url.split('/').pop()).trim();
        return sendJson(res, 200, store.getFeed(username));
      }

      if (req.method === 'GET' && req.url.startsWith('/api/saved/')) {
        const username = decodeURIComponent(req.url.split('/').pop()).trim();
        return sendJson(res, 200, store.getSavedPosts(username));
      }

      if (req.method === 'GET' && req.url.startsWith('/api/stories/')) {
        const username = decodeURIComponent(req.url.split('/').pop()).trim();
        return sendJson(res, 200, store.getStories(username));
      }

      if (req.method === 'GET' && req.url.startsWith('/api/notifications/')) {
        const username = decodeURIComponent(req.url.split('/').pop()).trim();
        return sendJson(res, 200, store.getNotifications(username));
      }

      if (req.method === 'GET' && req.url === '/api/users') {
        return sendJson(res, 200, store.getUsers());
      }

      if (req.method === 'POST' && req.url === '/api/users') {
        const body = await parseBody(req);
        const required = ['username', 'name', 'avatarUrl', 'bio'];
        if (required.some((key) => !body[key])) {
          return sendJson(res, 400, { error: 'username, name, avatarUrl and bio are required' });
        }

        const user = store.createUser({
          username: String(body.username).trim(),
          name: String(body.name).trim(),
          avatarUrl: String(body.avatarUrl).trim(),
          bio: String(body.bio).trim(),
        });

        return sendJson(res, 201, user);
      }

      if (req.method === 'POST' && req.url === '/api/follow') {
        const body = await parseBody(req);
        if (!body.follower || !body.following) {
          return sendJson(res, 400, { error: 'follower and following are required' });
        }

        return sendJson(
          res,
          200,
          store.followUser(String(body.follower).trim(), String(body.following).trim()),
        );
      }

      if (req.method === 'POST' && req.url === '/api/posts') {
        const body = await parseBody(req);
        const { username, imageUrl, caption } = body;

        if (!username || !imageUrl || !caption) {
          return sendJson(res, 400, {
            error: 'username, imageUrl and caption are required',
          });
        }

        const post = store.createPost({
          username: String(username).trim(),
          imageUrl: String(imageUrl).trim(),
          caption: String(caption).trim(),
        });

        return sendJson(res, 201, post);
      }

      const likeMatch = req.url.match(/^\/api\/posts\/(\d+)\/like$/);
      if (req.method === 'POST' && likeMatch) {
        const body = await parseBody(req);
        if (!body.username) return sendJson(res, 400, { error: 'username is required' });

        const post = store.toggleLike(Number(likeMatch[1]), String(body.username).trim());
        if (!post) return sendJson(res, 404, { error: 'Post not found' });
        return sendJson(res, 200, post);
      }

      const saveMatch = req.url.match(/^\/api\/posts\/(\d+)\/save$/);
      if (req.method === 'POST' && saveMatch) {
        const body = await parseBody(req);
        if (!body.username) return sendJson(res, 400, { error: 'username is required' });

        const result = store.toggleSave(Number(saveMatch[1]), String(body.username).trim());
        if (!result) return sendJson(res, 404, { error: 'Post not found' });
        return sendJson(res, 200, result);
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
