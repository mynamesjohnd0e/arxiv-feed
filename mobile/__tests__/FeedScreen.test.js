import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

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
    categories: ['cs.LG', 'cs.AI'],
    published: '2024-01-15T00:00:00Z',
    arxivUrl: 'http://arxiv.org/abs/2401.00001v1',
  },
  {
    id: '2401.00002v1',
    title: 'Vision Transformer Paper',
    headline: 'Vision Models Get Smarter',
    summary: 'New computer vision technique improves accuracy.',
    keyTakeaway: 'Key takeaway: Works on edge devices.',
    tags: ['Vision', 'Efficiency'],
    authors: ['Alice Brown'],
    categories: ['cs.CV'],
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

import FeedScreen from '../screens/FeedScreen';

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve(mockFeedResponse),
    });
  });

  it('renders header correctly', async () => {
    const { getByText } = render(<FeedScreen navigation={{ navigate: mockNavigate }} />);

    expect(getByText('arXiv Feed')).toBeTruthy();
    expect(getByText('AI Research, Simplified')).toBeTruthy();
  });

  it('renders search bar', async () => {
    const { getByPlaceholderText } = render(<FeedScreen navigation={{ navigate: mockNavigate }} />);

    expect(getByPlaceholderText('Search papers, authors, topics...')).toBeTruthy();
  });

  it('renders category filter chips', async () => {
    const { getByText } = render(<FeedScreen navigation={{ navigate: mockNavigate }} />);

    expect(getByText('All')).toBeTruthy();
    expect(getByText('ML')).toBeTruthy();
    expect(getByText('NLP')).toBeTruthy();
    expect(getByText('Vision')).toBeTruthy();
  });

  it('renders paper cards after loading', async () => {
    const { findByText } = render(<FeedScreen navigation={{ navigate: mockNavigate }} />);

    const headline = await findByText('New ML Breakthrough Discovered');
    expect(headline).toBeTruthy();
  });

  it('navigates to paper detail when card is pressed', async () => {
    const { findByText } = render(<FeedScreen navigation={{ navigate: mockNavigate }} />);

    const headline = await findByText('New ML Breakthrough Discovered');
    fireEvent.press(headline);

    expect(mockNavigate).toHaveBeenCalledWith('PaperDetail', {
      paper: expect.objectContaining({ id: '2401.00001v1' }),
    });
  });

  it('filters by category when chip is pressed', async () => {
    const { getAllByText, findByText } = render(<FeedScreen navigation={{ navigate: mockNavigate }} />);

    // Wait for initial load
    await findByText('New ML Breakthrough Discovered');

    // Press NLP filter (unique, doesn't appear in mock paper tags)
    const nlpElements = getAllByText('NLP');
    fireEvent.press(nlpElements[0]); // First one is the filter chip

    // Verify fetch was called with category parameter
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=nlp')
      );
    });
  });

  it('searches when search button is pressed', async () => {
    const { getByText, getByPlaceholderText, findByText } = render(
      <FeedScreen navigation={{ navigate: mockNavigate }} />
    );

    // Wait for initial load
    await findByText('New ML Breakthrough Discovered');

    // Type in search
    const searchInput = getByPlaceholderText('Search papers, authors, topics...');
    fireEvent.changeText(searchInput, 'transformer');

    // Press search button
    fireEvent.press(getByText('Search'));

    // Verify fetch was called with search parameter
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=transformer')
      );
    });
  });

  it('shows loading state initially', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    const { getByText } = render(<FeedScreen navigation={{ navigate: mockNavigate }} />);

    expect(getByText('Loading AI research...')).toBeTruthy();
  });

  it('shows empty state when no papers match', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ papers: [], page: 0, totalPapers: 0, hasMore: false }),
    });

    const { findByText } = render(<FeedScreen navigation={{ navigate: mockNavigate }} />);

    const emptyText = await findByText('No papers found');
    expect(emptyText).toBeTruthy();
  });
});
