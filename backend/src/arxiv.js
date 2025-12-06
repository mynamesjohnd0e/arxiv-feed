import { parseStringPromise } from 'xml2js';

const ARXIV_API_URL = 'http://export.arxiv.org/api/query';

// AI-related categories on arXiv
const AI_CATEGORIES = [
  'cs.AI',  // Artificial Intelligence
  'cs.LG',  // Machine Learning
  'cs.CL',  // Computation and Language (NLP)
  'cs.CV',  // Computer Vision
  'cs.NE',  // Neural and Evolutionary Computing
  'stat.ML' // Machine Learning (Statistics)
];

export async function fetchArxivPapers(options = {}) {
  const {
    maxResults = 20,
    start = 0,
    sortBy = 'submittedDate',
    sortOrder = 'descending'
  } = options;

  const categoryQuery = AI_CATEGORIES.map(cat => `cat:${cat}`).join('+OR+');

  const url = `${ARXIV_API_URL}?search_query=${categoryQuery}&start=${start}&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=${sortOrder}`;

  const response = await fetch(url);
  const xml = await response.text();
  const result = await parseStringPromise(xml);

  const entries = result.feed.entry || [];

  return entries.map(entry => ({
    id: entry.id[0].split('/abs/')[1],
    title: entry.title[0].replace(/\n/g, ' ').trim(),
    abstract: entry.summary[0].replace(/\n/g, ' ').trim(),
    authors: entry.author.map(a => a.name[0]),
    published: entry.published[0],
    updated: entry.updated[0],
    categories: entry.category.map(c => c.$.term),
    pdfUrl: entry.link.find(l => l.$.title === 'pdf')?.$.href,
    arxivUrl: entry.id[0]
  }));
}
