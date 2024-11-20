import type { BlacklistEntry, BlacklistMatch } from '../types';

export class BlacklistChecker {
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/['".,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const s1 = this.normalizeText(str1);
    const s2 = this.normalizeText(str2);

    if (s1 === s2) return 1;

    const pairs1 = this.getPairs(s1);
    const pairs2 = this.getPairs(s2);
    const union = pairs1.size + pairs2.size;
    const intersection = new Set([...pairs1].filter(x => pairs2.has(x))).size;

    return (2.0 * intersection) / union;
  }

  private static getPairs(str: string): Set<string> {
    const pairs = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      pairs.add(str.slice(i, i + 2));
    }
    return pairs;
  }

  static checkName(name: string, blacklist: BlacklistEntry[]): BlacklistMatch | null {
    if (!name || !blacklist?.length) return null;
    
    const normalizedName = this.normalizeText(name);
    const SIMILARITY_THRESHOLD = 0.8;

    for (const entry of blacklist) {
      if (entry.inn && entry.inn === name) {
        return {
          isMatch: true,
          matchedName: entry.inn,
          matchType: 'inn',
          language: 'numeric', // 'numeric' indicating it's an ID rather than a language
          entry
        };
      }
      
      const nameChecks = [
        { value: entry.names.fullNameEn, type: 'full' as const, lang: 'en' as const },
        { value: entry.names.fullNameRu, type: 'full' as const, lang: 'ru' as const },
        { value: entry.names.shortNameEn, type: 'short' as const, lang: 'en' as const },
        { value: entry.names.shortNameRu, type: 'short' as const, lang: 'ru' as const },
        { value: entry.names.abbreviationEn, type: 'abbreviation' as const, lang: 'en' as const },
        { value: entry.names.abbreviationRu, type: 'abbreviation' as const, lang: 'ru' as const },
      ];

      for (const check of nameChecks) {
        const similarity = this.calculateSimilarity(normalizedName, check.value);
        if (similarity >= SIMILARITY_THRESHOLD) {
          return {
            isMatch: true,
            matchedName: check.value,
            matchType: check.type,
            language: check.lang,
            entry
          };
        }
      }
    }

    return null;
  }
}