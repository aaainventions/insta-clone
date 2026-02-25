# Insta Clone (Full Stack)

A lightweight full-stack Instagram clone with:

- **Node.js HTTP API** for posts, likes, and comments
- **JSON-file persistence** with seeded starter posts/comments
- **Vanilla JS frontend** with a feed and post composer

## Run locally

```bash
npm start
```

Then open `http://localhost:3000`.

## API routes

- `GET /api/posts` - list posts with comments
- `POST /api/posts` - create a post
- `POST /api/posts/:id/like` - like a post
- `POST /api/posts/:id/comments` - add comment to a post

## Test

```bash
npm test
```
