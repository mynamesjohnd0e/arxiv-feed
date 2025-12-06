import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fetchArxivPapers } from './arxiv.js';
import { summarizePapers } from './summarize.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory cache for summarized papers
let cachedFeed = [];
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Category mappings for filtering
const CATEGORY_MAP = {
  'ml': ['cs.LG', 'stat.ML'],
  'nlp': ['cs.CL'],
  'vision': ['cs.CV'],
  'ai': ['cs.AI'],
  'robotics': ['cs.RO'],
  'neural': ['cs.NE'],
};

// Get the feed of summarized papers
app.get('/api/feed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const refresh = req.query.refresh === 'true';
    const search = req.query.search?.toLowerCase() || '';
    const category = req.query.category?.toLowerCase() || '';

    const now = Date.now();
    const needsRefresh = refresh || cachedFeed.length === 0 || (now - lastFetchTime > CACHE_DURATION);

    if (needsRefresh) {
      console.log('Fetching fresh papers from arXiv...');
      const papers = await fetchArxivPapers({ maxResults: 30 });

      console.log(`Summarizing ${papers.length} papers with Claude...`);
      cachedFeed = await summarizePapers(papers);
      lastFetchTime = now;
      console.log('Feed updated successfully');
    }

    // Filter by search term
    let filteredFeed = cachedFeed;
    if (search) {
      filteredFeed = filteredFeed.filter(paper =>
        paper.title.toLowerCase().includes(search) ||
        paper.headline.toLowerCase().includes(search) ||
        paper.summary.toLowerCase().includes(search) ||
        paper.authors.some(a => a.toLowerCase().includes(search)) ||
        paper.tags?.some(t => t.toLowerCase().includes(search))
      );
    }

    // Filter by category
    if (category && CATEGORY_MAP[category]) {
      const categoryArxiv = CATEGORY_MAP[category];
      filteredFeed = filteredFeed.filter(paper =>
        paper.categories.some(c => categoryArxiv.includes(c))
      );
    }

    const start = page * limit;
    const paginatedFeed = filteredFeed.slice(start, start + limit);

    res.json({
      papers: paginatedFeed,
      page,
      totalPapers: filteredFeed.length,
      hasMore: start + limit < filteredFeed.length
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
  const paper = cachedFeed.find(p => p.id === req.params.id);
  if (paper) {
    res.json(paper);
  } else {
    res.status(404).json({ error: 'Paper not found' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cachedPapers: cachedFeed.length });
});

app.listen(PORT, () => {
  console.log(`arXiv Feed API running on http://localhost:${PORT}`);
});
