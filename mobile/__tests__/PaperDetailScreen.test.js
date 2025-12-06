import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock expo modules
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

import PaperDetailScreen from '../screens/PaperDetailScreen';
import * as WebBrowser from 'expo-web-browser';

const mockPaper = {
  id: '2401.00001v1',
  title: 'Test Paper: A Novel Approach to Machine Learning',
  headline: 'New ML Method Boosts Performance',
  summary: 'Researchers developed a novel machine learning approach that significantly improves model performance across benchmarks.',
  keyTakeaway: 'Key takeaway: This technique could reduce training time by 50%.',
  tags: ['LLM', 'Efficiency', 'Training'],
  authors: ['John Doe', 'Jane Smith', 'Bob Wilson'],
  categories: ['cs.LG', 'cs.AI'],
  published: '2024-01-15T00:00:00Z',
  abstract: 'This paper presents a novel approach to machine learning. We demonstrate improvements across multiple benchmarks and provide theoretical analysis.',
  pdfUrl: 'https://arxiv.org/pdf/2401.00001v1',
  arxivUrl: 'http://arxiv.org/abs/2401.00001v1',
};

const mockRoute = {
  params: {
    paper: mockPaper,
  },
};

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('PaperDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders paper headline', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('New ML Method Boosts Performance')).toBeTruthy();
  });

  it('renders all tags', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('LLM')).toBeTruthy();
    expect(getByText('Efficiency')).toBeTruthy();
    expect(getByText('Training')).toBeTruthy();
  });

  it('renders AI summary section', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('AI Summary')).toBeTruthy();
    expect(getByText(/novel machine learning approach/)).toBeTruthy();
  });

  it('renders key takeaway', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText(/reduce training time by 50%/)).toBeTruthy();
  });

  it('renders original title section', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Original Title')).toBeTruthy();
    expect(getByText(/Novel Approach to Machine Learning/)).toBeTruthy();
  });

  it('renders all authors', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Authors')).toBeTruthy();
    expect(getByText(/John Doe, Jane Smith, Bob Wilson/)).toBeTruthy();
  });

  it('renders full abstract', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Full Abstract')).toBeTruthy();
    expect(getByText(/theoretical analysis/)).toBeTruthy();
  });

  it('renders categories', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Categories')).toBeTruthy();
    expect(getByText('cs.LG')).toBeTruthy();
    expect(getByText('cs.AI')).toBeTruthy();
  });

  it('renders arxiv ID', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText(/arXiv ID: 2401.00001v1/)).toBeTruthy();
  });

  it('renders View PDF button', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('View PDF')).toBeTruthy();
  });

  it('renders Open arXiv button', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Open arXiv')).toBeTruthy();
  });

  it('opens PDF in browser when View PDF is pressed', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    fireEvent.press(getByText('View PDF'));

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(mockPaper.pdfUrl);
  });

  it('opens arXiv page in browser when Open arXiv is pressed', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    fireEvent.press(getByText('Open arXiv'));

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(mockPaper.arxivUrl);
  });

  it('displays formatted publication date', () => {
    const { getByText } = render(
      <PaperDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    // The date format depends on locale, so we check for "Published:" prefix
    expect(getByText(/Published:/)).toBeTruthy();
  });
});
