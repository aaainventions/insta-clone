const fs = require('node:fs');
const path = require('node:path');

function initialData() {
  const now = new Date().toISOString();
  return {
    nextPostId: 4,
    nextCommentId: 4,
    users: [
      {
        username: 'travelwithmia',
        name: 'Mia Woods',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
        bio: 'Mountains, coffee, and golden-hour adventures.',
      },
      {
        username: 'codebyalex',
        name: 'Alex Kim',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop',
        bio: 'Building products one commit at a time.',
      },
      {
        username: 'urbanlens',
        name: 'Noa Rivera',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop',
        bio: 'Street photography and city stories.',
      },
    ],
    follows: [
      { follower: 'codebyalex', following: 'travelwithmia' },
      { follower: 'urbanlens', following: 'travelwithmia' },
    ],
    posts: [
      {
        id: 1,
        username: 'travelwithmia',
        imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1080',
        caption: 'Golden hour and mountain air 🌄 #travel #adventure',
        tags: ['travel', 'adventure'],
        likes: 1243,
        likedBy: ['codebyalex', 'urbanlens'],
        createdAt: now,
      },
      {
        id: 2,
        username: 'codebyalex',
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080',
        caption: 'Shipping features from the coffee bar ☕💻 #buildinpublic',
        tags: ['buildinpublic'],
        likes: 872,
        likedBy: ['travelwithmia'],
        createdAt: now,
      },
      {
        id: 3,
        username: 'urbanlens',
        imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1080',
        caption: 'Rainy neon evenings in the city. #streetphotography #citylife',
        tags: ['streetphotography', 'citylife'],
        likes: 517,
        likedBy: ['travelwithmia', 'codebyalex'],
        createdAt: now,
      },
    ],
    comments: [
      { id: 1, postId: 1, username: 'insta_fan', text: 'Love this vibe!', createdAt: now },
      { id: 2, postId: 2, username: 'dev_daily', text: 'Great setup 🙌', createdAt: now },
      { id: 3, postId: 3, username: 'travelwithmia', text: 'These tones are insane 🔥', createdAt: now },
    ],
    bookmarks: [
      { username: 'codebyalex', postId: 1 },
      { username: 'travelwithmia', postId: 3 },
    ],
    notifications: [],
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

  function addNotification(data, username, type, actor, postId) {
    if (!username || username === actor) return;
    data.notifications.unshift({
      id: `${Date.now()}-${Math.random()}`,
      username,
      type,
      actor,
      postId,
      createdAt: new Date().toISOString(),
      read: false,
    });
    data.notifications = data.notifications.slice(0, 150);
  }

  function getUserMap(data) {
    return new Map(data.users.map((user) => [user.username, user]));
  }

  function enrichPost(data, post, viewer) {
    const userMap = getUserMap(data);
    const owner = userMap.get(post.username);
    const comments = data.comments
      .filter((comment) => comment.postId === post.id)
      .sort((a, b) => b.id - a.id)
      .map((comment) => ({ ...comment, avatarUrl: userMap.get(comment.username)?.avatarUrl || '' }));

    return {
      ...post,
      owner,
      comments,
      isLikedByViewer: viewer ? post.likedBy.includes(viewer) : false,
      isSavedByViewer: viewer ? data.bookmarks.some((item) => item.username === viewer && item.postId === post.id) : false,
    };
  }

  function ensureUser(data, username) {
    return data.users.find((user) => user.username === username);
  }

  return {
    getUsers() {
      const data = load();
      return data.users;
    },
    createUser(payload) {
      const data = load();
      if (ensureUser(data, payload.username)) {
        throw new Error('Username already exists');
      }
      const user = {
        username: payload.username,
        name: payload.name,
        avatarUrl: payload.avatarUrl,
        bio: payload.bio,
      };
      data.users.push(user);
      save(data);
      return user;
    },
    followUser(follower, following) {
      const data = load();
      if (follower === following) throw new Error('Cannot follow yourself');
      if (!ensureUser(data, follower) || !ensureUser(data, following)) {
        throw new Error('Unknown user');
      }

      const existing = data.follows.find((item) => item.follower === follower && item.following === following);
      if (existing) {
        data.follows = data.follows.filter((item) => !(item.follower === follower && item.following === following));
        save(data);
        return { following: false };
      }

      data.follows.push({ follower, following });
      addNotification(data, following, 'follow', follower);
      save(data);
      return { following: true };
    },
    getPosts(viewer) {
      const data = load();
      return data.posts.slice().sort((a, b) => b.id - a.id).map((post) => enrichPost(data, post, viewer));
    },
    getFeed(username) {
      const data = load();
      const allowed = new Set([username]);
      for (const follow of data.follows) {
        if (follow.follower === username) {
          allowed.add(follow.following);
        }
      }

      return data.posts
        .filter((post) => allowed.has(post.username))
        .slice()
        .sort((a, b) => b.id - a.id)
        .map((post) => enrichPost(data, post, username));
    },
    getSavedPosts(username) {
      const data = load();
      const ids = new Set(data.bookmarks.filter((item) => item.username === username).map((item) => item.postId));
      return data.posts
        .filter((post) => ids.has(post.id))
        .slice()
        .sort((a, b) => b.id - a.id)
        .map((post) => enrichPost(data, post, username));
    },
    explore(query, tag, viewer) {
      const data = load();
      const q = query.toLowerCase();
      const t = tag.toLowerCase();
      return data.posts
        .filter((post) => {
          const matchQ = !q || post.caption.toLowerCase().includes(q) || post.username.toLowerCase().includes(q);
          const matchTag = !t || post.tags.includes(t);
          return matchQ && matchTag;
        })
        .slice()
        .sort((a, b) => b.likes - a.likes || b.id - a.id)
        .map((post) => enrichPost(data, post, viewer));
    },
    createPost(payload) {
      const data = load();
      const owner = ensureUser(data, payload.username);
      if (!owner) {
        throw new Error('User does not exist');
      }

      const tags = [...payload.caption.matchAll(/#([a-z0-9_]+)/gi)].map((match) => match[1].toLowerCase());
      const post = {
        id: data.nextPostId++,
        likes: 0,
        likedBy: [],
        createdAt: new Date().toISOString(),
        username: payload.username,
        imageUrl: payload.imageUrl,
        caption: payload.caption,
        tags,
      };

      data.posts.push(post);
      save(data);

      return enrichPost(data, post, payload.username);
    },
    toggleLike(postId, username) {
      const data = load();
      const post = data.posts.find((item) => item.id === postId);
      if (!post) return null;

      if (!ensureUser(data, username)) {
        throw new Error('Unknown user');
      }

      const index = post.likedBy.indexOf(username);
      if (index >= 0) {
        post.likedBy.splice(index, 1);
      } else {
        post.likedBy.push(username);
        addNotification(data, post.username, 'like', username, post.id);
      }
      post.likes = post.likedBy.length;
      save(data);
      return enrichPost(data, post, username);
    },
    toggleSave(postId, username) {
      const data = load();
      const post = data.posts.find((item) => item.id === postId);
      if (!post) return null;
      if (!ensureUser(data, username)) {
        throw new Error('Unknown user');
      }

      const existing = data.bookmarks.find((item) => item.username === username && item.postId === postId);
      if (existing) {
        data.bookmarks = data.bookmarks.filter((item) => !(item.username === username && item.postId === postId));
        save(data);
        return { saved: false };
      }

      data.bookmarks.push({ username, postId });
      save(data);
      return { saved: true };
    },
    addComment(postId, username, text) {
      const data = load();
      const post = data.posts.find((item) => item.id === postId);
      if (!post) return null;
      if (!ensureUser(data, username)) {
        throw new Error('Unknown user');
      }

      const comment = {
        id: data.nextCommentId++,
        postId,
        username,
        text,
        createdAt: new Date().toISOString(),
      };

      data.comments.push(comment);
      addNotification(data, post.username, 'comment', username, post.id);
      save(data);

      return comment;
    },
    getStories(username) {
      const data = load();
      const following = new Set([username]);
      for (const follow of data.follows) {
        if (follow.follower === username) {
          following.add(follow.following);
        }
      }

      return data.users
        .filter((user) => following.has(user.username))
        .map((user) => ({
          ...user,
          hasStory: data.posts.some((post) => post.username === user.username),
        }));
    },
    getNotifications(username) {
      const data = load();
      return data.notifications.filter((notification) => notification.username === username).slice(0, 20);
    },
  };
}

module.exports = { createStore };
