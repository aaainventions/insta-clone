const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

function startServer() {
  return new Promise((resolve) => {
    const dbFile = path.join(os.tmpdir(), `insta-clone-${Date.now()}-${Math.random()}.json`);
    const server = createServer(dbFile);
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

test('GET /api/posts returns seeded posts', async () => {
  const { server, port } = await startServer();
  const response = await fetch(`http://127.0.0.1:${port}/api/posts`);
  assert.equal(response.status, 200);

  const posts = await response.json();
  assert.ok(Array.isArray(posts));
  assert.ok(posts.length >= 1);
  server.close();
});

test('POST /api/posts creates a new post for an existing user', async () => {
  const { server, port } = await startServer();
  const response = await fetch(`http://127.0.0.1:${port}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'codebyalex',
      imageUrl: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=1080',
      caption: 'Test post #test',
    }),
  });

  assert.equal(response.status, 201);
  const post = await response.json();
  assert.equal(post.username, 'codebyalex');
  assert.equal(post.caption, 'Test post #test');
  assert.deepEqual(post.tags, ['test']);
  server.close();
});

test('POST /api/posts/:id/like toggles like for user', async () => {
  const { server, port } = await startServer();
  const response = await fetch(`http://127.0.0.1:${port}/api/posts/1/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'codebyalex' }),
  });

  assert.equal(response.status, 200);
  const post = await response.json();
  assert.equal(post.isLikedByViewer, false);
  server.close();
});

test('GET /api/feed/:username returns personalized feed', async () => {
  const { server, port } = await startServer();
  const response = await fetch(`http://127.0.0.1:${port}/api/feed/codebyalex`);
  assert.equal(response.status, 200);

  const posts = await response.json();
  assert.ok(posts.every((item) => ['codebyalex', 'travelwithmia'].includes(item.username)));
  server.close();
});
