import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

// Mock expo modules
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => React.createElement('SafeAreaProvider', null, children),
    SafeAreaView: ({ children }) => React.createElement('SafeAreaView', null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock react-navigation
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: ({ children }) => React.createElement('NavigationContainer', null, children),
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: {} }),
    DefaultTheme: { dark: false, colors: {} },
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockPapers = [
  {
    id: '2401.00001v1',
    title: 'Test Paper on Machine Learning',
    headline: 'New ML Breakthrough Discovered',
    problem: 'Current ML methods are slow.',
    approach: 'New optimization approach.',
    method: 'Uses efficient training.',
    findings: 'Reduces training time by 50%.',
    takeaway: 'ML training can be faster.',
    tags: ['LLM', 'Efficiency'],
    authors: ['John Doe', 'Jane Smith'],
    categories: ['cs.LG', 'cs.AI'],
    published: '2024-01-15T00:00:00Z',
    arxivUrl: 'http://arxiv.org/abs/2401.00001v1',
  },
  {
    id: '2401.00002v1',
    title: 'Another AI Paper',
    headline: 'Vision Models Get Smarter',
    problem: 'Vision models need improvement.',
    approach: 'New transformer design.',
    method: 'Works on edge devices.',
    findings: 'Better accuracy achieved.',
    takeaway: 'Vision transformers are now faster.',
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

// Import FeedScreen directly instead of App (simpler testing)
import FeedScreen from '../screens/FeedScreen';

const mockNavigation = { navigate: jest.fn() };

describe('FeedScreen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve(mockFeedResponse),
    });
  });

  it('renders loading state initially', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    const { getByText } = render(<FeedScreen navigation={mockNavigation} />);
    expect(getByText('Loading AI research...')).toBeTruthy();
  });

  it('renders paper cards after loading', async () => {
    const { findByText } = render(<FeedScreen navigation={mockNavigation} />);

    const headline = await findByText('New ML Breakthrough Discovered');
    expect(headline).toBeTruthy();

    const headline2 = await findByText('Vision Models Get Smarter');
    expect(headline2).toBeTruthy();
  });

  it('displays paper tags', async () => {
    const { findByText, findAllByText } = render(<FeedScreen navigation={mockNavigation} />);

    const llmTag = await findByText('LLM');
    expect(llmTag).toBeTruthy();

    // 'Efficiency' appears in both papers, so use findAllByText
    const efficiencyTags = await findAllByText('Efficiency');
    expect(efficiencyTags.length).toBeGreaterThan(0);
  });

  it('displays takeaway', async () => {
    const { findByText } = render(<FeedScreen navigation={mockNavigation} />);

    const takeaway = await findByText(/ML training can be faster/);
    expect(takeaway).toBeTruthy();
  });

  it('navigates to detail when paper is tapped', async () => {
    const { findByText } = render(<FeedScreen navigation={mockNavigation} />);

    const headline = await findByText('New ML Breakthrough Discovered');
    fireEvent.press(headline);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('PaperDetail', {
      paper: expect.objectContaining({ id: '2401.00001v1' }),
    });
  });

  it('displays authors', async () => {
    const { findByText } = render(<FeedScreen navigation={mockNavigation} />);

    const authors = await findByText(/John Doe, Jane Smith/);
    expect(authors).toBeTruthy();
  });

  it('fetches from correct API endpoint', async () => {
    render(<FeedScreen navigation={mockNavigation} />);

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

    const { findByText } = render(<FeedScreen navigation={mockNavigation} />);

    const etAl = await findByText(/et al\./);
    expect(etAl).toBeTruthy();
  });
});
