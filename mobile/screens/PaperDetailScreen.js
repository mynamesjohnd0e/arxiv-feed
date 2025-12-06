import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

export default function PaperDetailScreen({ route, navigation }) {
  const { paper } = route.params;

  const openPDF = async () => {
    if (paper.pdfUrl) {
      await WebBrowser.openBrowserAsync(paper.pdfUrl);
    }
  };

  const openArxiv = async () => {
    await WebBrowser.openBrowserAsync(paper.arxivUrl);
  };

  const tagColors = {
    LLM: '#8b5cf6',
    Vision: '#3b82f6',
    NLP: '#10b981',
    Efficiency: '#f59e0b',
    Training: '#ef4444',
    Benchmarks: '#6366f1',
    default: '#64748b',
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

        <View style={styles.aiSummaryContainer}>
          <Text style={styles.aiSummaryLabel}>AI-GENERATED SUMMARY</Text>
          <Text style={styles.summary}>{paper.summary}</Text>
          <View style={styles.keyTakeawayContainer}>
            <Text style={styles.keyTakeaway}>{paper.keyTakeaway}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Original Title</Text>
          <Text style={styles.originalTitle}>{paper.title}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authors</Text>
          <Text style={styles.authors}>{paper.authors?.join(', ')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Full Abstract</Text>
          <Text style={styles.abstract}>{paper.abstract}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesContainer}>
            {paper.categories?.map((cat, index) => (
              <View key={index} style={styles.categoryChip}>
                <Text style={styles.categoryText}>{cat}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.metadata}>
          <Text style={styles.metadataText}>
            Published: {new Date(paper.published).toLocaleDateString()}
          </Text>
          <Text style={styles.metadataText}>arXiv ID: {paper.id}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.pdfButton} onPress={openPDF}>
            <Text style={styles.buttonText}>View PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.arxivButton} onPress={openArxiv}>
            <Text style={styles.buttonText}>Open arXiv</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headline: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 34,
    marginTop: 16,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  aiSummaryContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  aiSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b5cf6',
    letterSpacing: 2,
    marginBottom: 12,
  },
  summary: {
    fontSize: 18,
    color: '#ffffff',
    lineHeight: 28,
    marginBottom: 16,
  },
  keyTakeawayContainer: {
    backgroundColor: '#252538',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  keyTakeaway: {
    fontSize: 16,
    color: '#c0c0d0',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  originalTitle: {
    fontSize: 16,
    color: '#c0c0d0',
    lineHeight: 24,
  },
  authors: {
    fontSize: 15,
    color: '#a0a0b0',
    lineHeight: 22,
  },
  abstract: {
    fontSize: 15,
    color: '#b0b0c0',
    lineHeight: 24,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    color: '#a0a0b0',
    fontSize: 13,
  },
  metadata: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
    marginBottom: 16,
  },
  metadataText: {
    fontSize: 13,
    color: '#808090',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  pdfButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  arxivButton: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
