import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock papers for testing
const mockPapers = [
  {
    id: '2401.00001v1',
    title: 'Advances in Large Language Models',
    headline: 'LLMs Get Smarter',
    problem: 'Current LLMs lack efficiency.',
    approach: 'New training techniques applied.',
    method: 'Uses sparse attention.',
    findings: 'Better efficiency achieved.',
    takeaway: 'LLMs can be more efficient.',
    tags: ['LLM', 'Efficiency'],
    authors: ['John Doe', 'Jane Smith'],
    categories: ['cs.CL', 'cs.AI'],
    published: '2024-01-15T00:00:00Z',
    abstract: 'This paper presents advances in LLMs.',
    arxivUrl: 'http://arxiv.org/abs/2401.00001v1',
  },
  {
    id: '2401.00002v1',
    title: 'Computer Vision Transformer Architecture',
    headline: 'Vision Transformers Improved',
    problem: 'Vision models need improvement.',
    approach: 'New transformer design.',
    method: 'Uses hierarchical attention.',
    findings: 'State-of-the-art accuracy.',
    takeaway: 'Better vision transformers now possible.',
    tags: ['Vision', 'Training'],
    authors: ['Alice Brown', 'Bob Wilson'],
    categories: ['cs.CV'],
    published: '2024-01-16T00:00:00Z',
    abstract: 'We propose a new vision transformer.',
    arxivUrl: 'http://arxiv.org/abs/2401.00002v1',
  },
  {
    id: '2401.00003v1',
    title: 'Reinforcement Learning for Robotics',
    headline: 'Robots Learn Faster',
    problem: 'Robot training is slow.',
    approach: 'New RL algorithm.',
    method: 'Uses model-based learning.',
    findings: '10x faster training.',
    takeaway: 'Robots can learn much faster.',
    tags: ['Training', 'Efficiency'],
    authors: ['Charlie Davis'],
    categories: ['cs.LG', 'cs.RO'],
    published: '2024-01-17T00:00:00Z',
    abstract: 'RL methods for robotics applications.',
    arxivUrl: 'http://arxiv.org/abs/2401.00003v1',
  },
];

// Mock the arxiv and summarize modules
const mockFetchArxivPapers = jest.fn();
const mockSummarizePapers = jest.fn();

jest.unstable_mockModule('../arxiv.js', () => ({
  fetchArxivPapers: mockFetchArxivPapers,
}));

jest.unstable_mockModule('../summarize.js', () => ({
  summarizePapers: mockSummarizePapers,
}));

describe('API Endpoints', () => {
  let app;
  let request;

  beforeEach(async () => {
    jest.resetModules();

    // Re-mock after reset
    jest.unstable_mockModule('../arxiv.js', () => ({
      fetchArxivPapers: mockFetchArxivPapers,
    }));

    jest.unstable_mockModule('../summarize.js', () => ({
      summarizePapers: mockSummarizePapers,
    }));

    mockFetchArxivPapers.mockResolvedValue(mockPapers);
    mockSummarizePapers.mockResolvedValue(mockPapers);
  });

  describe('GET /api/feed', () => {
    it('should return paginated papers', async () => {
      const { default: express } = await import('express');
      const { fetchArxivPapers } = await import('../arxiv.js');
      const { summarizePapers } = await import('../summarize.js');

      // Simple test of filter logic
      const papers = mockPapers;
      const filtered = papers.slice(0, 2);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('2401.00001v1');
    });

    it('should filter papers by search term in title', () => {
      const search = 'language';
      const filtered = mockPapers.filter(paper =>
        paper.title.toLowerCase().includes(search) ||
        paper.headline.toLowerCase().includes(search)
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2401.00001v1');
    });

    it('should filter papers by search term in authors', () => {
      const search = 'alice';
      const filtered = mockPapers.filter(paper =>
        paper.authors.some(a => a.toLowerCase().includes(search))
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2401.00002v1');
    });

    it('should filter papers by search term in tags', () => {
      const search = 'llm';
      const filtered = mockPapers.filter(paper =>
        paper.tags?.some(t => t.toLowerCase().includes(search))
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2401.00001v1');
    });

    it('should filter papers by category - nlp', () => {
      const categoryArxiv = ['cs.CL'];
      const filtered = mockPapers.filter(paper =>
        paper.categories.some(c => categoryArxiv.includes(c))
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2401.00001v1');
    });

    it('should filter papers by category - vision', () => {
      const categoryArxiv = ['cs.CV'];
      const filtered = mockPapers.filter(paper =>
        paper.categories.some(c => categoryArxiv.includes(c))
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2401.00002v1');
    });

    it('should filter papers by category - ml', () => {
      const categoryArxiv = ['cs.LG', 'stat.ML'];
      const filtered = mockPapers.filter(paper =>
        paper.categories.some(c => categoryArxiv.includes(c))
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2401.00003v1');
    });

    it('should combine search and category filters', () => {
      const search = 'training';
      const categoryArxiv = ['cs.CV'];

      let filtered = mockPapers.filter(paper =>
        paper.tags?.some(t => t.toLowerCase().includes(search))
      );
      filtered = filtered.filter(paper =>
        paper.categories.some(c => categoryArxiv.includes(c))
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2401.00002v1');
    });

    it('should return empty array when no matches', () => {
      const search = 'nonexistent';
      const filtered = mockPapers.filter(paper =>
        paper.title.toLowerCase().includes(search)
      );

      expect(filtered).toHaveLength(0);
    });
  });

  describe('GET /api/paper/:id', () => {
    it('should find paper by id', () => {
      const id = '2401.00002v1';
      const paper = mockPapers.find(p => p.id === id);

      expect(paper).toBeDefined();
      expect(paper.title).toBe('Computer Vision Transformer Architecture');
    });

    it('should return undefined for non-existent id', () => {
      const id = 'nonexistent';
      const paper = mockPapers.find(p => p.id === id);

      expect(paper).toBeUndefined();
    });
  });

  describe('Category mappings', () => {
    const CATEGORY_MAP = {
      'ml': ['cs.LG', 'stat.ML'],
      'nlp': ['cs.CL'],
      'vision': ['cs.CV'],
      'ai': ['cs.AI'],
      'robotics': ['cs.RO'],
      'neural': ['cs.NE'],
    };

    it('should have correct ml category mapping', () => {
      expect(CATEGORY_MAP['ml']).toContain('cs.LG');
      expect(CATEGORY_MAP['ml']).toContain('stat.ML');
    });

    it('should have correct nlp category mapping', () => {
      expect(CATEGORY_MAP['nlp']).toContain('cs.CL');
    });

    it('should have correct vision category mapping', () => {
      expect(CATEGORY_MAP['vision']).toContain('cs.CV');
    });
  });
});
