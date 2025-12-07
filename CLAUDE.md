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
│       ├── summarize.js  # Claude API integration for paper summarization
│       ├── embeddings.js # Amazon Bedrock Titan embeddings for similarity search
│       ├── similarity.js # Vector similarity using cosine distance on embeddings
│       └── db.js         # DynamoDB storage for papers and embeddings
├── lambda/               # AWS Lambda batch processor
│   ├── index.js          # Scheduled batch processing handler
│   ├── summarize.js      # Summarization with embedding generation
│   └── embeddings.js     # Bedrock Titan embeddings
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
AWS_ACCESS_KEY_ID=your_aws_key      # Required for DynamoDB and Bedrock embeddings
AWS_SECRET_ACCESS_KEY=your_secret   # Required for DynamoDB and Bedrock embeddings
AWS_REGION=us-east-1                # Must have Bedrock Titan access enabled
DYNAMODB_TABLE=arxiv-papers         # DynamoDB table name
```

## API Endpoints

- `GET /api/feed?page=0&limit=10&search=query&category=ml` - Get paginated feed with optional search/filter
- `GET /api/paper/:id` - Get single paper by arXiv ID
- `GET /api/paper/:id/similar` - Get similar papers using vector embeddings (with tag fallback)
- `POST /api/search` - LLM-powered semantic search (see below)
- `GET /api/categories` - Get available filter categories
- `GET /api/health` - Health check

## Key Implementation Details

- Backend caches summarized papers for 30 minutes
- Search filters by title, headline, summary, authors, and tags
- Category filter maps to arXiv categories (ml, nlp, vision, ai, neural)
- Mobile uses react-navigation for screen transitions
- Claude generates: headline, summary, keyTakeaway, and tags for each paper
- For physical Android devices, update API_URL in FeedScreen.js with your local IP

## Paper Similarity (Vector Embeddings)

Similar papers are found using semantic similarity with Amazon Bedrock Titan embeddings:

1. **Embedding Generation**: When papers are summarized, a 1024-dimensional vector embedding is generated using `amazon.titan-embed-text-v2:0` model from the paper's title + abstract
2. **Cosine Similarity**: Similar papers are found by computing cosine similarity between embedding vectors
3. **Fallback**: If embeddings are unavailable, falls back to tag-based matching (2 points per tag match, 1 point per category match)
4. **Threshold**: Only papers with similarity score > 0.3 are returned
5. **Storage**: Embeddings are stored in DynamoDB alongside paper metadata

The similarity API returns:
- `similar`: Array of similar papers
- `similarityScore`: Cosine similarity (0-1 for embeddings, normalized for tags)
- `similarityMethod`: "embedding" or "tags"

## Semantic Search (LLM-Powered)

The `/api/search` endpoint provides natural language paper search with guardrails:

**Request:**
```json
POST /api/search
{
  "query": "papers about reducing hallucinations in large language models",
  "limit": 10,
  "includeSummary": true
}
```

**Response:**
```json
{
  "success": true,
  "query": "reducing LLM hallucinations",
  "originalQuery": "papers about reducing hallucinations in large language models",
  "searchTerms": ["LLM", "hallucinations", "factuality"],
  "summary": "Found papers focusing on...",
  "papers": [{ ...paper, "relevanceScore": 0.82 }]
}
```

**Guardrails:**
- Query validation ensures only academic paper searches are allowed
- Blocks personal questions, off-topic requests, and jailbreak attempts
- Query length limited to 500 characters
- Returns `{ success: false, error: "invalid_query", message: "..." }` for blocked queries

**How it works:**
1. Claude validates and refines the query into optimal search terms
2. Query is expanded and embedded using Bedrock Titan
3. Cosine similarity finds most relevant papers
4. Optional: Claude generates a natural language summary of results

## Batch Processing

Run `npm run batch` in the backend folder to fetch and process 100 papers:
- Fetches papers from arXiv in batches of 50
- Deduplicates against existing papers in DynamoDB
- Summarizes with Claude + generates embeddings with Bedrock
- Saves to DynamoDB
