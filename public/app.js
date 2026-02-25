const feedEl = document.getElementById('feed');
const storiesEl = document.getElementById('stories');
const notificationsEl = document.getElementById('notifications');
const postTemplate = document.getElementById('post-template');
const postForm = document.getElementById('post-form');
const profileForm = document.getElementById('profile-form');
const currentUserEl = document.getElementById('current-user');
const searchInputEl = document.getElementById('search-input');

let currentView = 'feed';
let users = [];

function getCurrentUser() {
  return currentUserEl.value;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }

  return response.json();
}

function renderUsers() {
  currentUserEl.innerHTML = '';
  for (const user of users) {
    const option = document.createElement('option');
    option.value = user.username;
    option.textContent = `${user.username} · ${user.name}`;
    currentUserEl.appendChild(option);
  }
}

function renderPosts(posts) {
  feedEl.innerHTML = '';

  posts.forEach((post) => {
    const node = postTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector('.avatar').src = post.owner?.avatarUrl || '';
    node.querySelector('.username').textContent = post.username;
    node.querySelector('.bio').textContent = post.owner?.bio || '';
    node.querySelector('.post-image').src = post.imageUrl;
    node.querySelector('.caption').textContent = post.caption;
    node.querySelector('.like-count').textContent = `${post.likes} likes`;

    const likeBtn = node.querySelector('.like-btn');
    likeBtn.textContent = post.isLikedByViewer ? '💔 Unlike' : '❤️ Like';

    const saveBtn = node.querySelector('.save-btn');
    saveBtn.textContent = post.isSavedByViewer ? '✅ Saved' : '🔖 Save';

    const followBtn = node.querySelector('.follow-btn');
    followBtn.disabled = post.username === getCurrentUser();

    const tagsEl = node.querySelector('.tags');
    tagsEl.innerHTML = '';
    for (const tag of post.tags || []) {
      const tagBtn = document.createElement('button');
      tagBtn.className = 'tag';
      tagBtn.textContent = `#${tag}`;
      tagBtn.addEventListener('click', async () => {
        searchInputEl.value = '';
        currentView = 'explore';
        await loadFeed('', tag);
      });
      tagsEl.appendChild(tagBtn);
    }

    const commentsEl = node.querySelector('.comments');
    for (const comment of post.comments) {
      const li = document.createElement('li');
      li.textContent = `${comment.username}: ${comment.text}`;
      commentsEl.appendChild(li);
    }

    likeBtn.addEventListener('click', async () => {
      await request(`/api/posts/${post.id}/like`, {
        method: 'POST',
        body: JSON.stringify({ username: getCurrentUser() }),
      });
      await loadFeed();
    });

    saveBtn.addEventListener('click', async () => {
      await request(`/api/posts/${post.id}/save`, {
        method: 'POST',
        body: JSON.stringify({ username: getCurrentUser() }),
      });
      await loadFeed();
    });

    followBtn.addEventListener('click', async () => {
      await request('/api/follow', {
        method: 'POST',
        body: JSON.stringify({ follower: getCurrentUser(), following: post.username }),
      });
      await loadFeed();
    });

    node.querySelector('.comment-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const commentInput = event.currentTarget.elements.comment;
      const text = commentInput.value.trim();
      if (!text) return;

      await request(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ username: getCurrentUser(), text }),
      });

      commentInput.value = '';
      await loadFeed();
    });

    feedEl.appendChild(node);
  });
}

function renderStories(stories) {
  storiesEl.innerHTML = '';
  for (const story of stories) {
    if (!story.hasStory) continue;
    const pill = document.createElement('div');
    pill.className = 'story-pill';
    pill.innerHTML = `<img src="${story.avatarUrl}" alt="${story.username}" /><span>${story.username}</span>`;
    storiesEl.appendChild(pill);
  }
}

function renderNotifications(notifications) {
  notificationsEl.innerHTML = '';
  for (const item of notifications) {
    const li = document.createElement('li');
    if (item.type === 'follow') {
      li.textContent = `${item.actor} followed you.`;
    } else if (item.type === 'like') {
      li.textContent = `${item.actor} liked your post #${item.postId}.`;
    } else {
      li.textContent = `${item.actor} commented on your post #${item.postId}.`;
    }
    notificationsEl.appendChild(li);
  }
}

async function loadFeed(search = searchInputEl.value.trim(), tag = '') {
  let posts;
  const user = encodeURIComponent(getCurrentUser());

  if (currentView === 'explore') {
    posts = await request(
      `/api/explore?q=${encodeURIComponent(search)}&tag=${encodeURIComponent(tag)}&viewer=${user}`,
    );
  } else if (currentView === 'saved') {
    posts = await request(`/api/saved/${user}`);
  } else {
    posts = await request(`/api/feed/${user}`);
  }

  const [stories, notifications] = await Promise.all([
    request(`/api/stories/${user}`),
    request(`/api/notifications/${user}`),
  ]);

  renderPosts(posts);
  renderStories(stories);
  renderNotifications(notifications);
}

async function bootstrap() {
  users = await request('/api/users');
  renderUsers();
  await loadFeed();
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', async () => {
    for (const item of document.querySelectorAll('.tab')) item.classList.remove('active');
    tab.classList.add('active');
    currentView = tab.dataset.view;
    await loadFeed();
  });
}

searchInputEl.addEventListener('input', async () => {
  currentView = 'explore';
  document.querySelector('[data-view="explore"]').classList.add('active');
  await loadFeed(searchInputEl.value.trim());
});

currentUserEl.addEventListener('change', async () => {
  await loadFeed();
});

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  const payload = {
    username: getCurrentUser(),
    imageUrl: form.elements.imageUrl.value.trim(),
    caption: form.elements.caption.value.trim(),
  };

  if (Object.values(payload).some((value) => !value)) {
    return;
  }

  await request('/api/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  form.reset();
  await loadFeed();
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    username: form.elements.username.value.trim(),
    name: form.elements.name.value.trim(),
    avatarUrl: form.elements.avatarUrl.value.trim(),
    bio: form.elements.bio.value.trim(),
  };

  await request('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  users = await request('/api/users');
  renderUsers();
  currentUserEl.value = payload.username;
  form.reset();
  await loadFeed();
});

bootstrap().catch((error) => {
  feedEl.innerHTML = `<p>Could not load feed: ${error.message}</p>`;
});
