const feedEl = document.getElementById('feed');
const postTemplate = document.getElementById('post-template');
const postForm = document.getElementById('post-form');

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

function renderPosts(posts) {
  feedEl.innerHTML = '';

  posts.forEach((post) => {
    const node = postTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector('.avatar').src = post.avatarUrl;
    node.querySelector('.username').textContent = post.username;
    node.querySelector('.post-image').src = post.imageUrl;
    node.querySelector('.caption').textContent = post.caption;
    node.querySelector('.like-count').textContent = `${post.likes} likes`;

    const commentsEl = node.querySelector('.comments');
    for (const comment of post.comments) {
      const li = document.createElement('li');
      li.textContent = `${comment.username}: ${comment.text}`;
      commentsEl.appendChild(li);
    }

    node.querySelector('.like-btn').addEventListener('click', async () => {
      await request(`/api/posts/${post.id}/like`, { method: 'POST' });
      await loadFeed();
    });

    node.querySelector('.comment-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const commentInput = event.currentTarget.elements.comment;
      const text = commentInput.value.trim();
      if (!text) return;

      await request(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ username: 'you', text }),
      });

      commentInput.value = '';
      await loadFeed();
    });

    feedEl.appendChild(node);
  });
}

async function loadFeed() {
  const posts = await request('/api/posts');
  renderPosts(posts);
}

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  const payload = {
    username: form.elements.username.value.trim(),
    avatarUrl: form.elements.avatarUrl.value.trim(),
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

loadFeed().catch((error) => {
  feedEl.innerHTML = `<p>Could not load feed: ${error.message}</p>`;
});
