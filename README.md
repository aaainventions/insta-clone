# Insta Clone Pro (Full Stack)

A significantly upgraded full-stack Instagram clone built with a Node.js HTTP server and a dynamic vanilla JS frontend.

## Features

- Multi-user profile system (create profiles in-app)
- Personalized feed based on follow graph
- Explore view with full-text search and hashtag filtering
- Story strip generated from followed users
- Post composer with automatic hashtag extraction
- Like/unlike toggle per user
- Save/unsave posts with dedicated Saved tab
- Follow/unfollow from feed cards
- Real-time-ish notification center (likes, comments, follows)
- JSON file persistence for all resources (posts, users, comments, follows, bookmarks, notifications)

## Run locally

```bash
npm start
```

Then open `http://localhost:3000`.

## API routes

### Posts & discovery
- `GET /api/posts?viewer=<username>`
- `GET /api/feed/:username`
- `GET /api/saved/:username`
- `GET /api/explore?q=<query>&tag=<tag>&viewer=<username>`
- `POST /api/posts`
- `POST /api/posts/:id/like`
- `POST /api/posts/:id/save`
- `POST /api/posts/:id/comments`

### Users & social graph
- `GET /api/users`
- `POST /api/users`
- `POST /api/follow`

### Extras
- `GET /api/stories/:username`
- `GET /api/notifications/:username`

## Test

```bash
npm test
```
