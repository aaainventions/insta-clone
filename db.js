const fs = require('node:fs');
const path = require('node:path');

function initialData() {
  const now = new Date().toISOString();
  return {
    nextPostId: 3,
    nextCommentId: 3,
    posts: [
      {
        id: 1,
        username: 'travelwithmia',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
        imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1080',
        caption: 'Golden hour and mountain air 🌄',
        likes: 1243,
        createdAt: now,
      },
      {
        id: 2,
        username: 'codebyalex',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop',
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080',
        caption: 'Shipping features from the coffee bar ☕💻',
        likes: 872,
        createdAt: now,
      },
    ],
    comments: [
      { id: 1, postId: 1, username: 'insta_fan', text: 'Love this vibe!', createdAt: now },
      { id: 2, postId: 2, username: 'dev_daily', text: 'Great setup 🙌', createdAt: now },
    ],
  };
}

function createStore(file = path.join(__dirname, 'data.json')) {
  function save(data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }

  function load() {
    if (!fs.existsSync(file)) {
      const data = initialData();
      save(data);
      return data;
    }

    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  return {
    getPosts() {
      const data = load();
      return data.posts
        .slice()
        .sort((a, b) => b.id - a.id)
        .map((post) => ({
          ...post,
          comments: data.comments
            .filter((comment) => comment.postId === post.id)
            .sort((a, b) => b.id - a.id)
            .map(({ id, username, text, createdAt }) => ({ id, username, text, createdAt })),
        }));
    },
    createPost(payload) {
      const data = load();
      const post = {
        id: data.nextPostId++,
        likes: 0,
        createdAt: new Date().toISOString(),
        ...payload,
      };

      data.posts.push(post);
      save(data);

      return { ...post, comments: [] };
    },
    likePost(postId) {
      const data = load();
      const post = data.posts.find((item) => item.id === postId);
      if (!post) return null;
      post.likes += 1;
      save(data);
      return post;
    },
    addComment(postId, username, text) {
      const data = load();
      const post = data.posts.find((item) => item.id === postId);
      if (!post) return null;

      const comment = {
        id: data.nextCommentId++,
        postId,
        username,
        text,
        createdAt: new Date().toISOString(),
      };

      data.comments.push(comment);
      save(data);

      return comment;
    },
  };
}

module.exports = { createStore };
