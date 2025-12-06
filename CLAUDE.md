# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

arXiv Feed is a mobile app that provides AI professionals with a TikTok-style scrollable feed of the latest AI research papers from arXiv. Papers are automatically summarized using Claude to make them quick and easy to digest.

## Architecture

```
arxiv-feed/
├── backend/              # Node.js Express API
│   └── src/
│       ├── index.js      # Express server with feed, search, filter endpoints
│       ├── arxiv.js      # arXiv API integration (fetches cs.AI, cs.LG, cs.CL, cs.CV, cs.NE, stat.ML)
│       └── summarize.js  # Claude API integration for paper summarization
└── mobile/               # React Native (Expo SDK 54) app
    ├── App.js            # Navigation container with react-navigation
    └── screens/
        ├── FeedScreen.js       # Main feed with search bar, category filters, paper cards
        └── PaperDetailScreen.js # Full paper details with abstract, authors, PDF link
```

## Commands

### Backend
```bash
cd backend
npm install
npm run dev          # Start with --watch for hot reload
npm start            # Production start
npm test             # Run Jest tests
```

### Mobile
```bash
cd mobile
npm install
npx expo start       # Start Expo dev server
npx expo start --android  # Android
npx expo start --ios      # iOS simulator
npm test             # Run Jest tests
```

## Environment Setup

Create `backend/.env` with:
```
ANTHROPIC_API_KEY=your_api_key_here
```

## API Endpoints

- `GET /api/feed?page=0&limit=10&search=query&category=ml` - Get paginated feed with optional search/filter
- `GET /api/paper/:id` - Get single paper by arXiv ID
- `GET /api/categories` - Get available filter categories
- `GET /api/health` - Health check

## Key Implementation Details

- Backend caches summarized papers for 30 minutes
- Search filters by title, headline, summary, authors, and tags
- Category filter maps to arXiv categories (ml, nlp, vision, ai, neural)
- Mobile uses react-navigation for screen transitions
- Claude generates: headline, summary, keyTakeaway, and tags for each paper
- For physical Android devices, update API_URL in FeedScreen.js with your local IP
