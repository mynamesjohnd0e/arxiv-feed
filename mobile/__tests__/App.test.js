import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

// Mock expo modules
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}));

// Mock fetch
global.fetch = jest.fn();

const mockPapers = [
  {
    id: '2401.00001v1',
    title: 'Test Paper on Machine Learning',
    headline: 'New ML Breakthrough Discovered',
    summary: 'Researchers found a novel approach to improve model performance.',
    keyTakeaway: 'Key takeaway: This could reduce training time by 50%.',
    tags: ['LLM', 'Efficiency'],
    authors: ['John Doe', 'Jane Smith'],
    published: '2024-01-15T00:00:00Z',
    arxivUrl: 'http://arxiv.org/abs/2401.00001v1',
  },
  {
    id: '2401.00002v1',
    title: 'Another AI Paper',
    headline: 'Vision Models Get Smarter',
    summary: 'New computer vision technique improves accuracy.',
    keyTakeaway: 'Key takeaway: Works on edge devices.',
    tags: ['Vision', 'Efficiency'],
    authors: ['Alice Brown'],
    published: '2024-01-16T00:00:00Z',
    arxivUrl: 'http://arxiv.org/abs/2401.00002v1',
  },
];

const mockFeedResponse = {
  papers: mockPapers,
  page: 0,
  totalPapers: 2,
  hasMore: false,
};

import App from '../App';
import * as WebBrowser from 'expo-web-browser';

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve(mockFeedResponse),
    });
  });

  it('renders loading state initially', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    const { getByText } = render(<App />);
    expect(getByText('Loading AI research...')).toBeTruthy();
  });

  it('renders paper cards after loading', async () => {
    const { findByText } = render(<App />);

    const headline = await findByText('New ML Breakthrough Discovered');
    expect(headline).toBeTruthy();

    const headline2 = await findByText('Vision Models Get Smarter');
    expect(headline2).toBeTruthy();
  });

  it('displays paper tags', async () => {
    const { findByText, findAllByText } = render(<App />);

    const llmTag = await findByText('LLM');
    expect(llmTag).toBeTruthy();

    // 'Efficiency' appears in both papers, so use findAllByText
    const efficiencyTags = await findAllByText('Efficiency');
    expect(efficiencyTags.length).toBeGreaterThan(0);
  });

  it('displays key takeaway', async () => {
    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText(/reduce training time/)).toBeTruthy();
    });
  });

  it('opens browser when paper is tapped', async () => {
    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText('New ML Breakthrough Discovered')).toBeTruthy();
    });

    fireEvent.press(getByText('New ML Breakthrough Discovered'));

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      'http://arxiv.org/abs/2401.00001v1'
    );
  });

  it('displays authors', async () => {
    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText(/John Doe, Jane Smith/)).toBeTruthy();
    });
  });

  it('fetches from correct API endpoint', async () => {
    render(<App />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/feed')
      );
    });
  });
});

describe('PaperCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve(mockFeedResponse),
    });
  });

  it('truncates long author lists', async () => {
    const manyAuthors = {
      ...mockPapers[0],
      authors: ['Author 1', 'Author 2', 'Author 3', 'Author 4', 'Author 5'],
    };
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ ...mockFeedResponse, papers: [manyAuthors] }),
    });

    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText(/et al\./)).toBeTruthy();
    });
  });
});
