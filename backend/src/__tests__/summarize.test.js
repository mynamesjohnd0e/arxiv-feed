import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockPaper = {
  id: '2401.00001v1',
  title: 'Test Paper: A Novel Approach to Machine Learning',
  abstract: 'This paper presents a novel approach to machine learning that improves performance significantly.',
  authors: ['John Doe', 'Jane Smith'],
  categories: ['cs.LG', 'cs.AI'],
};

const mockClaudeResponse = {
  content: [{
    text: JSON.stringify({
      headline: 'New ML Method Boosts Performance',
      summary: 'Researchers developed a novel machine learning approach that significantly improves model performance across benchmarks.',
      keyTakeaway: 'Key takeaway: This technique could reduce training time by 50%.',
      tags: ['LLM', 'Efficiency', 'Training'],
    }),
  }],
};

const mockCreate = jest.fn();

// Mock the Anthropic SDK before any imports
jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

describe('summarize module', () => {
  let summarizePaper;
  let summarizePapers;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCreate.mockReset();

    // Reset modules to get fresh imports
    jest.resetModules();

    // Re-mock after reset
    jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
      default: jest.fn().mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      })),
    }));

    const summarizeModule = await import('../summarize.js');
    summarizePaper = summarizeModule.summarizePaper;
    summarizePapers = summarizeModule.summarizePapers;
  });

  describe('summarizePaper', () => {
    it('should call Claude API and parse response', async () => {
      mockCreate.mockResolvedValue(mockClaudeResponse);

      const result = await summarizePaper(mockPaper);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          max_tokens: expect.any(Number),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(mockPaper.title),
            }),
          ]),
        })
      );

      expect(result).toMatchObject({
        headline: 'New ML Method Boosts Performance',
        summary: expect.stringContaining('novel machine learning'),
        keyTakeaway: expect.stringContaining('Key takeaway'),
        tags: expect.arrayContaining(['LLM', 'Efficiency']),
      });
    });

    it('should return fallback on JSON parse error', async () => {
      const badResponse = { content: [{ text: 'not valid json' }] };
      mockCreate.mockResolvedValue(badResponse);

      const result = await summarizePaper(mockPaper);

      expect(result.headline).toBe(mockPaper.title.slice(0, 60));
      expect(result.summary).toContain('...');
    });
  });

  describe('summarizePapers', () => {
    it('should summarize multiple papers', async () => {
      mockCreate.mockResolvedValue(mockClaudeResponse);

      const papers = [mockPaper, { ...mockPaper, id: '2401.00002v1' }];
      const results = await summarizePapers(papers);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('id', mockPaper.id);
      expect(results[0]).toHaveProperty('headline');
      expect(results[1]).toHaveProperty('id', '2401.00002v1');
    });
  });
});
