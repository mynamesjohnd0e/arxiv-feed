import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Production API URL
const API_URL = 'https://arxiv-feed-production.up.railway.app';

const CATEGORIES = [
  { id: '', name: 'All' },
  { id: 'ml', name: 'ML' },
  { id: 'nlp', name: 'NLP' },
  { id: 'vision', name: 'Vision' },
  { id: 'ai', name: 'AI' },
  { id: 'neural', name: 'Neural' },
];

function PaperCard({ paper, onPress }) {
  const tagColors = {
    LLM: '#8b5cf6',
    Vision: '#3b82f6',
    NLP: '#10b981',
    Efficiency: '#f59e0b',
    Training: '#ef4444',
    Benchmarks: '#6366f1',
    Multimodal: '#ec4899',
    RL: '#14b8a6',
    Safety: '#f97316',
    Data: '#06b6d4',
    default: '#64748b',
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardContent}>
        <Text style={styles.headline}>{paper.headline}</Text>

        <View style={styles.tagsContainer}>
          {paper.tags?.map((tag, index) => (
            <View
              key={index}
              style={[
                styles.tag,
                { backgroundColor: tagColors[tag] || tagColors.default },
              ]}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {paper.problem && (
          <View style={styles.structuredSection}>
            <Text style={styles.sectionLabel}>Problem</Text>
            <Text style={styles.sectionText}>{paper.problem}</Text>
          </View>
        )}

        {paper.findings && (
          <View style={styles.structuredSection}>
            <Text style={styles.sectionLabel}>Key Finding</Text>
            <Text style={styles.sectionText}>{paper.findings}</Text>
          </View>
        )}

        {paper.takeaway && (
          <Text style={styles.keyTakeaway}>{paper.takeaway}</Text>
        )}

        <View style={styles.metadata}>
          <Text style={styles.authors} numberOfLines={1}>
            {paper.authors?.slice(0, 3).join(', ')}
            {paper.authors?.length > 3 ? ' et al.' : ''}
          </Text>
          <Text style={styles.date}>
            {new Date(paper.published).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.tapHint}>Tap for details & share</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen({ navigation }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const fetchPapers = useCallback(async (pageNum = 0, refresh = false, search = activeSearch, category = selectedCategory) => {
    try {
      let url = `${API_URL}/api/feed?page=${pageNum}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (refresh) url += '&refresh=true';

      const response = await fetch(url);
      const data = await response.json();
      const fetchedPapers = data.papers || [];

      if (pageNum === 0) {
        setPapers(fetchedPapers);
      } else {
        setPapers((prev) => [...prev, ...fetchedPapers]);
      }
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeSearch, selectedCategory]);

  useEffect(() => {
    fetchPapers(0);
  }, []);

  useEffect(() => {
    setLoading(true);
    setPapers([]);
    fetchPapers(0, false, activeSearch, selectedCategory);
  }, [activeSearch, selectedCategory]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPapers(0, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchPapers(page + 1);
    }
  };

  const handleSearch = () => {
    setActiveSearch(searchQuery);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const openPaperDetail = (paper) => {
    navigation.navigate('PaperDetail', { paper });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>arXiv Feed</Text>
        <Text style={styles.headerSubtitle}>AI Research, Simplified</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search papers, authors, topics..."
          placeholderTextColor="#606070"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterChip,
                selectedCategory === cat.id && styles.filterChipActive,
              ]}
              onPress={() => handleCategorySelect(cat.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat.id && styles.filterChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && papers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading AI research...</Text>
        </View>
      ) : papers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No papers found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
        </View>
      ) : (
        <FlatList
          data={papers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PaperCard paper={item} onPress={() => openPaperDetail(item)} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#8b5cf6"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator style={styles.footerLoader} color="#8b5cf6" />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#a0a0b0',
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#808090',
    fontSize: 14,
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8b5cf6',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  searchButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  filterContainer: {
    paddingLeft: 16,
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  filterChipActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  filterChipText: {
    color: '#a0a0b0',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
  },
  headline: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 26,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  summary: {
    fontSize: 15,
    color: '#c0c0d0',
    lineHeight: 22,
    marginBottom: 12,
  },
  structuredSection: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b5cf6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: '#c0c0d0',
    lineHeight: 20,
  },
  keyTakeaway: {
    fontSize: 14,
    color: '#8b5cf6',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#8b5cf6',
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authors: {
    fontSize: 12,
    color: '#808090',
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: '#808090',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  tapHint: {
    fontSize: 13,
    color: '#8b5cf6',
    textAlign: 'center',
    fontWeight: '500',
  },
  footerLoader: {
    marginVertical: 20,
  },
});
