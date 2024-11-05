interface SdnEntry {
  firstName: string;
  lastName: string;
  fullName: string;
  type: string;
  remarks?: string;
  programs: string[];
  addresses: string[];
  ids: string[];
  allText: string;
}

export class OfacChecker {
  private static ofacList: SdnEntry[] = [];
  private static SIMILARITY_THRESHOLD = 0.75; // Changed from 0.85 to 0.75 (75%)

  static async initialize() {
    try {
      const response = await fetch('/data/sdn_advanced.xml');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const xmlText = await response.text();
      console.log('XML file size:', xmlText.length);

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Get all distinct party entries
      const distinctParties = xmlDoc.getElementsByTagName('DistinctParty');
      console.log('Found DistinctParty entries:', distinctParties.length);

      this.ofacList = Array.from(distinctParties).map(party => {
        // Get all name parts
        const namePartNodes = party.getElementsByTagName('NamePartValue');
        let firstName = '';
        let lastName = '';
        let wholeName = '';
        let allNameParts: string[] = [];

        Array.from(namePartNodes).forEach(namePart => {
          const nameValue = namePart.textContent || '';
          allNameParts.push(nameValue.toLowerCase());

          const nameType = namePart.parentElement?.getElementsByTagName('NamePartType')[0]?.textContent;
          if (nameType === 'GivenName') {
            firstName = nameValue;
          } else if (nameType === 'Surname') {
            lastName = nameValue;
          } else if (nameType === 'WholeName') {
            wholeName = nameValue;
          }
        });

        // Get sanctions programs
        const programNodes = party.getElementsByTagName('SanctionsProgram');
        const programs = Array.from(programNodes).map(prog => prog.textContent || '');

        // Get type
        const type = party.getElementsByTagName('PartyType')[0]?.textContent || '';

        // Construct the full name
        const fullName = wholeName || `${lastName} ${firstName}`.trim();

        return {
          firstName,
          lastName,
          fullName,
          type,
          remarks: '',
          programs,
          addresses: [],
          ids: [],
          allText: [...allNameParts, fullName.toLowerCase()].join(' ')
        };
      });

      console.log('Loaded SDN entries:', this.ofacList.length);
    } catch (error) {
      console.error('Failed to load OFAC list:', error);
    }
  }

  static checkName(searchText: string): { 
    isMatch: boolean; 
    matchScore: number; 
    matchedName?: string; 
    details?: Partial<SdnEntry>;
    matchType?: 'name' | 'address' | 'id' | 'other';
  } {
    searchText = searchText.toLowerCase().trim();
    console.log('Checking name:', searchText);
    
    let highestScore = 0;
    let matchedEntry: SdnEntry | undefined;

    // Split search text into parts
    const searchParts = searchText.split(/[\s,]+/);
    
    // Create pairs of words from search text
    const searchPairs: string[] = [];
    for (let i = 0; i < searchParts.length - 1; i++) {
      searchPairs.push(`${searchParts[i]} ${searchParts[i + 1]}`);
    }

    for (const entry of this.ofacList) {
      // Split entry text into parts and create pairs
      const entryParts = entry.allText.split(/[\s,]+/);
      const entryPairs: string[] = [];
      for (let i = 0; i < entryParts.length - 1; i++) {
        entryPairs.push(`${entryParts[i]} ${entryParts[i + 1]}`);
      }
      
      let currentScore = 0;
      let matchCount = 0;

      // Check pairs first
      for (const searchPair of searchPairs) {
        let pairHighestScore = 0;
        for (const entryPair of entryPairs) {
          const score = this.calculateSimilarity(searchPair, entryPair);
          pairHighestScore = Math.max(pairHighestScore, score);
        }
        if (pairHighestScore >= this.SIMILARITY_THRESHOLD) {
          currentScore += pairHighestScore;
          matchCount++;
        }
      }

      // If we have pair matches, calculate average score
      if (matchCount > 0) {
        currentScore = currentScore / matchCount;
      }

      if (currentScore > highestScore) {
        highestScore = currentScore;
        matchedEntry = entry;
        
        // Debug log for matches
        if (currentScore >= this.SIMILARITY_THRESHOLD) {
          console.log('Match found:', {
            searchText,
            matchedName: entry.fullName,
            score: currentScore
          });
        }
      }
    }

    const result = {
      isMatch: highestScore >= this.SIMILARITY_THRESHOLD,
      matchScore: highestScore,
      matchedName: matchedEntry?.fullName,
      matchType: 'name' as const,
      details: matchedEntry ? {
        type: matchedEntry.type,
        programs: matchedEntry.programs,
        remarks: matchedEntry.remarks
      } : undefined
    };

    console.log('Check result:', {
      searchName: searchText,
      matchScore: highestScore,
      matchedName: matchedEntry?.fullName,
      isMatch: result.isMatch
    });

    return result;
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const pairs1 = this.wordLetterPairs(str1);
    const pairs2 = this.wordLetterPairs(str2);
    const intersection = pairs1.filter(pair => pairs2.includes(pair)).length;
    const union = pairs1.length + pairs2.length;

    return (2.0 * intersection) / union;
  }

  private static wordLetterPairs(str: string): string[] {
    const pairs = [];
    const words = str.split(' ');
    for (const word of words) {
      const pairsInWord = [];
      for (let i = 0; i < word.length - 1; i++) {
        pairsInWord.push(word.substring(i, i + 2));
      }
      pairs.push(...pairsInWord);
    }
    return pairs;
  }
} 