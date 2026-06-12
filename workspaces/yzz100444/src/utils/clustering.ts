import { extractChineseWords, filterStopWords } from './preprocess';
import type { Answer, Topic, ClusteringResult, ProjectSettings } from '@/types';

interface Cluster {
  id: string;
  answers: Answer[];
  wordFreq: Map<string, number>;
}

export const calculateTF = (words: string[]): Map<string, number> => {
  const tf = new Map<string, number>();
  const total = words.length;
  for (const word of words) {
    tf.set(word, (tf.get(word) || 0) + 1 / total);
  }
  return tf;
};

export const calculateIDF = (documents: string[][]): Map<string, number> => {
  const idf = new Map<string, number>();
  const totalDocs = documents.length;
  for (const doc of documents) {
    const uniqueWords = new Set(doc);
    for (const word of uniqueWords) {
      idf.set(word, (idf.get(word) || 0) + 1);
    }
  }
  for (const [word, count] of idf) {
    idf.set(word, Math.log(totalDocs / (count + 1)));
  }
  return idf;
};

export const calculateTFIDF = (
  words: string[],
  idf: Map<string, number>
): Map<string, number> => {
  const tf = calculateTF(words);
  const tfidf = new Map<string, number>();
  for (const [word, tfValue] of tf) {
    const idfValue = idf.get(word) || 0;
    tfidf.set(word, tfValue * idfValue);
  }
  return tfidf;
};

export const cosineSimilarity = (
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number => {
  const allWords = new Set([...vec1.keys(), ...vec2.keys()]);
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (const word of allWords) {
    const v1 = vec1.get(word) || 0;
    const v2 = vec2.get(word) || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (norm1 * norm2);
};

export const clusterAnswers = (
  answers: Answer[],
  settings: ProjectSettings,
  projectId: string
): ClusteringResult => {
  const startTime = Date.now();
  
  const nonDuplicateAnswers = answers.filter(a => !a.isDuplicate);
  
  const documents = nonDuplicateAnswers.map(a => 
    filterStopWords(extractChineseWords(a.cleanedText))
  );
  
  const idf = calculateIDF(documents);
  
  const answerVectors = documents.map(words => calculateTFIDF(words, idf));
  
  const sensitivity = settings.clusteringSensitivity;
  const threshold = 0.15 + sensitivity * 0.35;
  
  const clusters: Cluster[] = [];
  
  for (let i = 0; i < nonDuplicateAnswers.length; i++) {
    const answer = nonDuplicateAnswers[i];
    const vector = answerVectors[i];
    
    let bestClusterIndex = -1;
    let bestSimilarity = 0;
    
    for (let j = 0; j < clusters.length; j++) {
      const cluster = clusters[j];
      const clusterWords = Array.from(cluster.wordFreq.keys());
      const clusterVector = calculateTFIDF(clusterWords, idf);
      const similarity = cosineSimilarity(vector, clusterVector);
      
      if (similarity > bestSimilarity && similarity >= threshold) {
        bestSimilarity = similarity;
        bestClusterIndex = j;
      }
    }
    
    if (bestClusterIndex >= 0) {
      clusters[bestClusterIndex].answers.push(answer);
      const words = documents[i];
      for (const word of words) {
        clusters[bestClusterIndex].wordFreq.set(
          word,
          (clusters[bestClusterIndex].wordFreq.get(word) || 0) + 1
        );
      }
    } else {
      const wordFreq = new Map<string, number>();
      for (const word of documents[i]) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
      clusters.push({
        id: `cluster-${Date.now()}-${clusters.length}`,
        answers: [answer],
        wordFreq,
      });
    }
  }
  
  const totalAnswers = answers.length;
  const topics: Topic[] = clusters.map((cluster, index) => {
    const sortedWords = Array.from(cluster.wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const keywords = sortedWords.map(([word]) => word);
    const topicName = keywords.slice(0, 3).join(' · ');
    
    const representativeIds = selectRepresentativeAnswers(
      cluster.answers,
      keywords,
      3
    );
    
    const answerCount = cluster.answers.length;
    
    return {
      id: `topic-${Date.now()}-${index}`,
      projectId,
      name: topicName || `主题 ${index + 1}`,
      answerCount,
      percentage: (answerCount / totalAnswers) * 100,
      keywords,
      representativeAnswerIds: representativeIds,
      isPinned: false,
      isRisk: false,
      riskScore: 0,
      riskReason: '',
      sentimentScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  
  const clusteredAnswers = answers.map(answer => {
    for (const cluster of clusters) {
      if (cluster.answers.some(a => a.id === answer.id)) {
        const topic = topics.find(t => {
          const clusterForTopic = clusters.find(c => c.id === cluster.id);
          return clusterForTopic?.answers.some(a => a.id === answer.id);
        });
        return { ...answer, topicId: topic?.id || null };
      }
    }
    const duplicate = answers.find(a => a.id === answer.duplicateOfId);
    if (duplicate) {
      const topic = topics.find(t => 
        clusters.some(c => c.answers.some(a => a.id === duplicate.id && c.id === t.id))
      );
      return { ...answer, topicId: topic?.id || null };
    }
    return { ...answer, topicId: null };
  });
  
  const processingTime = Date.now() - startTime;
  
  return {
    topics,
    answers: clusteredAnswers,
    processingTime,
    stats: {
      totalAnswers,
      clusteredAnswers: clusteredAnswers.filter(a => a.topicId).length,
      unclusteredAnswers: clusteredAnswers.filter(a => !a.topicId).length,
      riskTopics: 0,
      riskAnswers: 0,
    },
  };
};

export const selectRepresentativeAnswers = (
  answers: Answer[],
  keywords: string[],
  count: number
): string[] => {
  const scored = answers.map(answer => {
    const text = answer.cleanedText;
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
    const lengthScore = text.length >= 15 && text.length <= 120 ? 2 : 1;
    const uniqueness = 1 + Math.random() * 0.5;
    return { answer, score: score * lengthScore * uniqueness };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, count).map(s => s.answer.id);
};
