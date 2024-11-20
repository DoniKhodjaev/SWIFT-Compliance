interface SdnEntry {
  name: string;
  name_variations: string[];
  type: string;
  date_of_birth?: string;
  id_number?: string; // Optional ID number for TIN comparison
}

export class OfacChecker {
  private static ofacList: SdnEntry[] = [];
  private static initialized = false;
  private static FULL_NAME_THRESHOLD = 0.85; // Full name match threshold
  private static PARTIAL_NAME_THRESHOLD = 0.75; // Partial name match threshold

  // Initialize OFAC data if not already loaded
  static async initialize() {
    if (this.initialized) return; // Prevent re-initialization

    try {
      const response = await fetch('/data/sdn_cache.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.ofacList = await response.json();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load OFAC list:', error);
    }
  }

  /**
   * Check a name or entity against the OFAC list.
   * @param searchText The text to search (name or entity).
   * @returns Match details with score and type.
   */
  static async checkName(searchText: string): Promise<{
    isMatch: boolean;
    matchScore: number;
    matchedEntry?: SdnEntry;
    matchType?: 'name';
  }> {
    await this.initialize(); // Ensure the list is loaded

    searchText = searchText?.toLowerCase().trim() || '';
    let highestScore = 0;
    let matchedEntry: SdnEntry | undefined;

    for (const entry of this.ofacList) {
      // Calculate similarity for name
      const fullNameScore = this.calculateSimilarity(searchText, entry.name.toLowerCase());
      const variationScores = Array.isArray(entry.name_variations)
        ? entry.name_variations.map(variation =>
            this.calculateSimilarity(searchText, variation.toLowerCase())
          )
        : [];

      const bestVariationScore = Math.max(fullNameScore, ...variationScores);
      if (bestVariationScore > highestScore) {
        highestScore = bestVariationScore;
        matchedEntry = entry;
      }
    }

    const isMatch = highestScore >= this.FULL_NAME_THRESHOLD || highestScore >= this.PARTIAL_NAME_THRESHOLD;
    return {
      isMatch,
      matchScore: highestScore,
      matchedEntry: isMatch ? matchedEntry : undefined,
      matchType: 'name',
    };
  }

  /**
   * Calculate similarity score between two strings.
   * @param str1 First string.
   * @param str2 Second string.
   * @returns A similarity score between 0.0 and 1.0.
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;

    const pairs1 = this.wordLetterPairs(str1);
    const pairs2 = this.wordLetterPairs(str2);
    const intersection = pairs1.filter(pair => pairs2.includes(pair)).length;
    const union = pairs1.length + pairs2.length;

    return (2.0 * intersection) / union;
  }

  /**
   * Create letter pairs for each word in a string.
   * @param str Input string.
   * @returns An array of letter pairs.
   */
  private static wordLetterPairs(str: string): string[] {
    const pairs: string[] = [];
    const words = str.split(' ');
    for (const word of words) {
      for (let i = 0; i < word.length - 1; i++) {
        pairs.push(word.substring(i, i + 2));
      }
    }
    return pairs;
  }
}
