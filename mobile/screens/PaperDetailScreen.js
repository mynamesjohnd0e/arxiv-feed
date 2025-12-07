import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';

const API_URL = 'https://arxiv-feed-production.up.railway.app';

export default function PaperDetailScreen({ route, navigation }) {
  const { paper } = route.params;
  const [similarPapers, setSimilarPapers] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        const response = await fetch(`${API_URL}/api/paper/${paper.id}/similar`);
        const data = await response.json();
        setSimilarPapers(data.similar || []);
      } catch (error) {
        console.log('Could not fetch similar papers');
      } finally {
        setLoadingSimilar(false);
      }
    };
    fetchSimilar();
  }, [paper.id]);

  const openSimilarPaper = (similarPaper) => {
    navigation.push('PaperDetail', { paper: similarPaper });
  };

  const openPDF = async () => {
    if (paper.pdfUrl) {
      await WebBrowser.openBrowserAsync(paper.pdfUrl);
    }
  };

  const openArxiv = async () => {
    await WebBrowser.openBrowserAsync(paper.arxivUrl);
  };

  // Generate LinkedIn-friendly formatted text
  const generateShareText = () => {
    const tags = paper.tags?.map(t => `#${t}`).join(' ') || '';
    return `${paper.headline}

Problem: ${paper.problem || 'See paper'}

Approach: ${paper.approach || 'See paper'}

Key Finding: ${paper.findings || 'See paper'}

Takeaway: ${paper.takeaway || 'See paper'}

Paper: ${paper.arxivUrl}

${tags} #AI #Research #MachineLearning`;
  };

  const shareToLinkedIn = async () => {
    const text = encodeURIComponent(generateShareText());
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(paper.arxivUrl)}`;
    await WebBrowser.openBrowserAsync(url);
  };

  const copyShareText = async () => {
    await Clipboard.setStringAsync(generateShareText());
    alert('Copied to clipboard! Paste into LinkedIn.');
  };

  const shareNative = async () => {
    try {
      await Share.share({
        message: generateShareText(),
        title: paper.headline,
      });
    } catch (error) {
      console.error(error);
    }
  };

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

          {paper.problem && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>PROBLEM</Text>
              <Text style={styles.summaryText}>{paper.problem}</Text>
            </View>
          )}

          {paper.approach && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>APPROACH</Text>
              <Text style={styles.summaryText}>{paper.approach}</Text>
            </View>
          )}

          {paper.method && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>METHOD</Text>
              <Text style={styles.summaryText}>{paper.method}</Text>
            </View>
          )}

          {paper.findings && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>KEY FINDINGS</Text>
              <Text style={styles.summaryText}>{paper.findings}</Text>
            </View>
          )}

          {paper.takeaway && (
            <View style={styles.keyTakeawayContainer}>
              <Text style={styles.keyTakeaway}>{paper.takeaway}</Text>
            </View>
          )}
        </View>

        <View style={styles.shareContainer}>
          <Text style={styles.shareLabel}>SHARE TO LINKEDIN</Text>
          <View style={styles.shareButtons}>
            <TouchableOpacity style={styles.shareButton} onPress={copyShareText}>
              <Text style={styles.shareButtonText}>Copy Text</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkedInButton} onPress={shareNative}>
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(loadingSimilar || similarPapers.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similar Papers</Text>
            {loadingSimilar ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              similarPapers.map((sp) => (
                <TouchableOpacity
                  key={sp.id}
                  style={styles.similarCard}
                  onPress={() => openSimilarPaper(sp)}
                >
                  <View style={styles.similarContent}>
                    <Text style={styles.similarHeadline} numberOfLines={2}>
                      {sp.headline}
                    </Text>
                    <View style={styles.similarTags}>
                      {sp.tags?.slice(0, 2).map((tag, i) => (
                        <View
                          key={i}
                          style={[
                            styles.smallTag,
                            { backgroundColor: tagColors[tag] || tagColors.default }
                          ]}
                        >
                          <Text style={styles.smallTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

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
    marginBottom: 16,
  },
  summaryRow: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 1,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
  keyTakeawayContainer: {
    backgroundColor: '#252538',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
    marginTop: 8,
  },
  keyTakeaway: {
    fontSize: 16,
    color: '#c0c0d0',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  shareContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#0077b5',
  },
  shareLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0077b5',
    letterSpacing: 2,
    marginBottom: 12,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  linkedInButton: {
    flex: 1,
    backgroundColor: '#0077b5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
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
  similarCard: {
    backgroundColor: '#252538',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  similarContent: {
    flex: 1,
  },
  similarHeadline: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20,
    marginBottom: 8,
  },
  similarTags: {
    flexDirection: 'row',
    gap: 6,
  },
  smallTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  smallTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#8b5cf6',
    marginLeft: 8,
  },
});
