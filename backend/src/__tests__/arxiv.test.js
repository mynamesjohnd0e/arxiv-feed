import { jest } from '@jest/globals';

// Mock fetch before importing the module
global.fetch = jest.fn();

const mockArxivResponse = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2401.00001v1</id>
    <title>Test Paper: A Novel Approach to Machine Learning</title>
    <summary>This paper presents a novel approach to machine learning that improves performance.</summary>
    <author><name>John Doe</name></author>
    <author><name>Jane Smith</name></author>
    <published>2024-01-15T00:00:00Z</published>
    <updated>2024-01-15T00:00:00Z</updated>
    <category term="cs.LG" />
    <category term="cs.AI" />
    <link href="http://arxiv.org/abs/2401.00001v1" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/2401.00001v1" rel="related" type="application/pdf"/>
  </entry>
</feed>`;

describe('arxiv module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchArxivPapers', () => {
    it('should fetch and parse papers from arXiv API', async () => {
      global.fetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockArxivResponse),
      });

      const { fetchArxivPapers } = await import('../arxiv.js');
      const papers = await fetchArxivPapers({ maxResults: 1 });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('export.arxiv.org/api/query')
      );

      expect(papers).toHaveLength(1);
      expect(papers[0]).toMatchObject({
        id: '2401.00001v1',
        title: 'Test Paper: A Novel Approach to Machine Learning',
        abstract: expect.stringContaining('novel approach'),
        authors: ['John Doe', 'Jane Smith'],
        categories: ['cs.LG', 'cs.AI'],
      });
    });

    it('should include AI-related categories in the query', async () => {
      global.fetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockArxivResponse),
      });

      const { fetchArxivPapers } = await import('../arxiv.js');
      await fetchArxivPapers();

      const fetchUrl = global.fetch.mock.calls[0][0];
      expect(fetchUrl).toContain('cs.AI');
      expect(fetchUrl).toContain('cs.LG');
      expect(fetchUrl).toContain('cs.CL');
    });

    it('should handle empty results', async () => {
      const emptyResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom"></feed>`;

      global.fetch.mockResolvedValueOnce({
        text: () => Promise.resolve(emptyResponse),
      });

      const { fetchArxivPapers } = await import('../arxiv.js');
      const papers = await fetchArxivPapers();

      expect(papers).toHaveLength(0);
    });
  });
});
