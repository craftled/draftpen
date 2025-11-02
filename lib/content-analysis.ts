// Extract introduction (first ~150 words, skip headings)
export function extractIntroduction(markdown: string): string {
  const paragraphs = markdown.split(/\n\n+/);
  let intro = "";
  let wordCount = 0;

  for (const para of paragraphs) {
    if (para.trim().startsWith("#")) continue;
    intro += para + "\n\n";
    wordCount += para.split(/\s+/).length;
    if (wordCount >= 150) break;
  }

  return intro.trim();
}

// Extract H2/H3 headings
export function extractHeadings(markdown: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
      });
    }
  }

  return headings;
}

// Calculate Flesch Reading Ease Score
export function calculateFleschReadingEase(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return 0;

  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  return 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
}

function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

// Calculate word count (strip markdown)
export function calculateWordCount(text: string): number {
  let cleaned = text.replace(/^#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`[^`]+`/g, "");
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned.split(/\s+/).filter((word) => word.length > 0).length;
}

// Extract keyword frequencies (unigrams + bigrams)
export function extractKeywordFrequencies(
  text: string,
  topN = 20
): Array<{ keyword: string; count: number }> {
  const cleaned = text.toLowerCase().replace(/[^\w\s]/g, " ");
  const words = cleaned.split(/\s+/).filter((w) => w.length > 3);

  const freq = new Map<string, number>();

  for (let i = 0; i < words.length; i++) {
    // Unigram
    freq.set(words[i], (freq.get(words[i]) || 0) + 1);

    // Bigram
    if (i < words.length - 1) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      freq.set(bigram, (freq.get(bigram) || 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([keyword, count]) => ({ keyword, count }));
}

