import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fetchArxivPapers } from './arxiv.js';
import { summarizePapers } from './summarize.js';
import { findSimilarPapers } from './similarity.js';
import { getRecentPapers, getPaper, savePapersBatch, getPaperCount } from './db.js';

// Check if DynamoDB is configured
const USE_DYNAMODB = !!(process.env.AWS_ACCESS_KEY_ID && process.env.DYNAMODB_TABLE);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory cache for summarized papers
let cachedFeed = [];
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Cache for search results (key: search term, value: { papers, timestamp })
const searchCache = new Map();
const SEARCH_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for search results

// Category mappings for arXiv
const CATEGORY_MAP = {
  'ml': 'cs.LG',
  'nlp': 'cs.CL',
  'vision': 'cs.CV',
  'ai': 'cs.AI',
  'robotics': 'cs.RO',
  'neural': 'cs.NE',
};

// Get the feed of summarized papers
app.get('/api/feed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const refresh = req.query.refresh === 'true';
    const search = req.query.search?.trim() || '';
    const category = req.query.category?.toLowerCase() || '';

    const now = Date.now();
    let papers = [];

    if (search) {
      // Live search from arXiv
      const cacheKey = `search:${search.toLowerCase()}`;
      const cached = searchCache.get(cacheKey);

      if (cached && !refresh && (now - cached.timestamp < SEARCH_CACHE_DURATION)) {
        console.log(`Using cached search results for: ${search}`);
        papers = cached.papers;
      } else {
        console.log(`Performing live arXiv search for: ${search}`);
        const rawPapers = await fetchArxivPapers({ search, maxResults: 10 });

        if (rawPapers.length > 0) {
          console.log(`Summarizing ${rawPapers.length} search results with Claude...`);
          papers = await summarizePapers(rawPapers);
          searchCache.set(cacheKey, { papers, timestamp: now });
        }
      }
    } else if (category && CATEGORY_MAP[category]) {
      // Category-specific fetch
      const cacheKey = `category:${category}`;
      const cached = searchCache.get(cacheKey);

      if (cached && !refresh && (now - cached.timestamp < SEARCH_CACHE_DURATION)) {
        console.log(`Using cached category results for: ${category}`);
        papers = cached.papers;
      } else {
        console.log(`Fetching papers for category: ${category}`);
        const rawPapers = await fetchArxivPapers({ category: CATEGORY_MAP[category], maxResults: 10 });

        if (rawPapers.length > 0) {
          console.log(`Summarizing ${rawPapers.length} category results with Claude...`);
          papers = await summarizePapers(rawPapers);
          searchCache.set(cacheKey, { papers, timestamp: now });
        }
      }
    } else {
      // Default feed - use L1 memory cache, L2 DynamoDB, L3 live fetch
      const needsRefresh = refresh || cachedFeed.length === 0 || (now - lastFetchTime > CACHE_DURATION);

      if (needsRefresh) {
        if (USE_DYNAMODB) {
          // Try DynamoDB first
          console.log('Fetching papers from DynamoDB...');
          try {
            cachedFeed = await getRecentPapers(50);
            if (cachedFeed.length > 0) {
              lastFetchTime = now;
              console.log(`Loaded ${cachedFeed.length} papers from DynamoDB`);
            }
          } catch (dbError) {
            console.error('DynamoDB fetch failed:', dbError.message);
          }
        }

        // Fallback to live fetch if DB is empty or not configured
        if (cachedFeed.length === 0) {
          console.log('Fetching fresh papers from arXiv...');
          const rawPapers = await fetchArxivPapers({ maxResults: 15 });

          console.log(`Summarizing ${rawPapers.length} papers with Claude...`);
          cachedFeed = await summarizePapers(rawPapers);
          lastFetchTime = now;
          console.log('Feed updated successfully');

          // Save to DynamoDB for future requests
          if (USE_DYNAMODB && cachedFeed.length > 0) {
            try {
              await savePapersBatch(cachedFeed);
              console.log('Saved papers to DynamoDB');
            } catch (dbError) {
              console.error('Failed to save to DynamoDB:', dbError.message);
            }
          }
        }
      }
      papers = cachedFeed;
    }

    const start = page * limit;
    const paginatedFeed = papers.slice(start, start + limit);

    res.json({
      papers: paginatedFeed,
      page,
      totalPapers: papers.length,
      hasMore: start + limit < papers.length
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Get available categories
app.get('/api/categories', (req, res) => {
  res.json({
    categories: [
      { id: 'ml', name: 'Machine Learning', arxiv: ['cs.LG', 'stat.ML'] },
      { id: 'nlp', name: 'NLP', arxiv: ['cs.CL'] },
      { id: 'vision', name: 'Computer Vision', arxiv: ['cs.CV'] },
      { id: 'ai', name: 'AI General', arxiv: ['cs.AI'] },
      { id: 'neural', name: 'Neural Networks', arxiv: ['cs.NE'] },
    ]
  });
});

// Get a single paper by ID
app.get('/api/paper/:id', async (req, res) => {
  // Check memory cache first
  let paper = cachedFeed.find(p => p.id === req.params.id);

  // Try DynamoDB if not in cache
  if (!paper && USE_DYNAMODB) {
    try {
      paper = await getPaper(req.params.id);
    } catch (dbError) {
      console.error('DynamoDB lookup failed:', dbError.message);
    }
  }

  if (paper) {
    res.json(paper);
  } else {
    res.status(404).json({ error: 'Paper not found' });
  }
});

// Get similar papers
app.get('/api/paper/:id/similar', (req, res) => {
  const paper = cachedFeed.find(p => p.id === req.params.id);

  if (!paper) {
    return res.status(404).json({ error: 'Paper not found' });
  }

  const similar = findSimilarPapers(paper, cachedFeed, 3);
  res.json({ similar });
});

// Health check
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    cachedPapers: cachedFeed.length,
    dynamodb: USE_DYNAMODB ? 'configured' : 'not configured',
  };

  if (USE_DYNAMODB) {
    try {
      health.dbPaperCount = await getPaperCount();
    } catch (err) {
      health.dynamodb = 'error';
      health.dbError = err.message;
    }
  }

  res.json(health);
});

app.listen(PORT, () => {
  console.log(`arXiv Feed API running on http://localhost:${PORT}`);
});
