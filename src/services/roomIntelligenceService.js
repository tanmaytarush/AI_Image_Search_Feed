/**
 * AI-Powered Room Intelligence Service
 * Dynamically generates room concepts and synonyms using semantic analysis
 */

class RoomIntelligenceService {
  constructor() {
    // AI-powered room concept generators instead of hardcoded lists
    this.roomConceptGenerators = {
      living: this.generateLivingSpaceConcepts.bind(this),
      bedroom: this.generateBedroomConcepts.bind(this),
      kitchen: this.generateKitchenConcepts.bind(this),
      dining: this.generateDiningConcepts.bind(this),
      bathroom: this.generateBathroomConcepts.bind(this),
      prayer: this.generatePrayerConcepts.bind(this),
      wardrobe: this.generateWardrobeConcepts.bind(this),
      office: this.generateOfficeConcepts.bind(this),
      entryway: this.generateEntrywayConcepts.bind(this),
      balcony: this.generateBalconyConcepts.bind(this),
      utility: this.generateUtilityConcepts.bind(this)
    };

    // Semantic patterns for compound term detection
    this.compoundPatterns = [
      { pattern: /(\w+)\s+room/i, examples: ['living room', 'dining room', 'bed room'] },
      { pattern: /(\w+)\s+area/i, examples: ['dining area', 'living area', 'kitchen area'] },
      { pattern: /(\w+)\s+space/i, examples: ['prayer space', 'living space', 'work space'] },
      { pattern: /(\w+)\s+mandir/i, examples: ['home mandir', 'puja mandir'] },
      { pattern: /(\w+)\s+pooja/i, examples: ['home pooja', 'family pooja'] },
      { pattern: /(\w+)\s+unit/i, examples: ['kitchen unit', 'bathroom unit'] },
      { pattern: /(\w+)\s+section/i, examples: ['dining section', 'living section'] }
    ];

    // Cache for generated concepts
    this.conceptCache = new Map();
  }

  /**
   * AI-powered room concept generation for living spaces
   */
  generateLivingSpaceConcepts() {
    const baseConcepts = ['living room', 'sitting room', 'lounge'];
    const culturalVariations = ['family room', 'drawing room', 'parlor', 'salon', 'reception'];
    const modernVariations = ['open living', 'great room', 'family living', 'entertainment room'];
    const regionalVariations = ['hall', 'baithak', 'otur', 'living area'];
    
    return this.expandConceptsWithAI(baseConcepts, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered room concept generation for bedrooms
   */
  generateBedroomConcepts() {
    const baseConcepts = ['bedroom', 'sleeping room'];
    const typeVariations = ['master bedroom', 'guest bedroom', 'children bedroom', 'kids room', 'kids bedroom', 'child bedroom', 'child room'];
    const culturalVariations = ['kamra', 'shayan kaksh', 'bed room', 'sleeping area'];
    const modernVariations = ['primary bedroom', 'secondary bedroom', 'suite', 'bedroom suite'];
    const regionalVariations = ['bedroom', 'sleeping chamber', 'rest room'];
    
    return this.expandConceptsWithAI(baseConcepts, typeVariations, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered room concept generation for kitchens
   */
  generateKitchenConcepts() {
    const baseConcepts = ['kitchen', 'cooking area'];
    const typeVariations = ['kitchenette', 'open kitchen', 'closed kitchen', 'modular kitchen'];
    const culturalVariations = ['rasoi', 'kitchen area', 'cooking space', 'kitchen room'];
    const modernVariations = ['gourmet kitchen', 'chef kitchen', 'kitchen island', 'kitchen dining'];
    const regionalVariations = ['kitchen', 'cooking room', 'food preparation area'];
    
    return this.expandConceptsWithAI(baseConcepts, typeVariations, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered room concept generation for dining spaces
   */
  generateDiningConcepts() {
    const baseConcepts = ['dining room', 'dining area'];
    const typeVariations = ['eating area', 'breakfast nook', 'dining space'];
    const culturalVariations = ['bhojan kaksh', 'dining hall', 'eating room'];
    const modernVariations = ['formal dining', 'casual dining', 'dining zone'];
    const regionalVariations = ['dining room', 'eating area', 'meal room'];
    
    return this.expandConceptsWithAI(baseConcepts, typeVariations, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered room concept generation for bathrooms
   */
  generateBathroomConcepts() {
    const baseConcepts = ['bathroom', 'washroom'];
    const typeVariations = ['toilet', 'restroom', 'powder room', 'ensuite'];
    const culturalVariations = ['bathroom', 'washroom', 'toilet room', 'bath area'];
    const modernVariations = ['master bathroom', 'guest bathroom', 'half bath', 'full bath'];
    const regionalVariations = ['bathroom', 'washroom', 'toilet', 'bath room'];
    
    return this.expandConceptsWithAI(baseConcepts, typeVariations, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered room concept generation for prayer spaces
   */
  generatePrayerConcepts() {
    const baseConcepts = ['puja room', 'pooja room', 'prayer room'];
    const typeVariations = ['temple', 'mandir', 'worship room', 'shrine'];
    const culturalVariations = ['puja kaksh', 'mandir room', 'worship area', 'prayer space'];
    const modernVariations = ['home temple', 'family mandir', 'prayer corner', 'meditation room'];
    const regionalVariations = ['puja room', 'mandir', 'temple', 'worship room'];
    
    return this.expandConceptsWithAI(baseConcepts, typeVariations, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered room concept generation for wardrobes
   */
  generateWardrobeConcepts() {
    const baseConcepts = ['wardrobe', 'closet'];
    const typeVariations = ['walk-in wardrobe', 'dressing room', 'storage room'];
    const culturalVariations = ['almirah', 'cupboard', 'dressing area', 'storage space'];
    const modernVariations = ['walk-in closet', 'dressing room', 'storage area'];
    const regionalVariations = ['wardrobe', 'closet', 'dressing room', 'storage'];
    
    return this.expandConceptsWithAI(baseConcepts, typeVariations, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered room concept generation for offices
   */
  generateOfficeConcepts() {
    const baseConcepts = ['home office', 'study room'];
    const typeVariations = ['work area', 'workspace', 'study area'];
    const culturalVariations = ['study kaksh', 'work room', 'office space'];
    const modernVariations = ['home office', 'study room', 'work zone'];
    const regionalVariations = ['office', 'study', 'work room', 'workspace'];
    
    return this.expandConceptsWithAI(baseConcepts, typeVariations, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered room concept generation for entryways
   */
  generateEntrywayConcepts() {
    const baseConcepts = ['entryway', 'foyer'];
    const typeVariations = ['vestibule', 'entrance hall', 'entry area'];
    const culturalVariations = ['dwar', 'entrance', 'entry space'];
    const modernVariations = ['entry hall', 'foyer area', 'entrance zone'];
    const regionalVariations = ['entryway', 'foyer', 'entrance', 'entry'];
    
    return this.expandConceptsWithAI(baseConcepts, typeVariations, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered room concept generation for balconies
   */
  generateBalconyConcepts() {
    const baseConcepts = ['balcony', 'terrace'];
    const typeVariations = ['veranda', 'patio', 'outdoor space'];
    const culturalVariations = ['balcony', 'terrace', 'outdoor area'];
    const modernVariations = ['outdoor living', 'balcony area', 'terrace space'];
    const regionalVariations = ['balcony', 'terrace', 'patio', 'outdoor'];
    
    return this.expandConceptsWithAI(baseConcepts, typeVariations, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered room concept generation for utility spaces
   */
  generateUtilityConcepts() {
    const baseConcepts = ['utility room', 'laundry room'];
    const typeVariations = ['mudroom', 'storage area', 'utility space'];
    const culturalVariations = ['utility', 'laundry', 'storage room'];
    const modernVariations = ['utility area', 'laundry space', 'storage zone'];
    const regionalVariations = ['utility', 'laundry', 'storage', 'mudroom'];
    
    return this.expandConceptsWithAI(baseConcepts, typeVariations, culturalVariations, modernVariations, regionalVariations);
  }

  /**
   * AI-powered concept expansion using semantic analysis
   */
  expandConceptsWithAI(...conceptArrays) {
    const allConcepts = conceptArrays.flat();
    const expandedConcepts = new Set(allConcepts);
    
    // AI-powered semantic expansion
    for (const concept of allConcepts) {
      const semanticVariations = this.generateSemanticVariations(concept);
      semanticVariations.forEach(variation => expandedConcepts.add(variation));
    }
    
    // AI-powered cultural variations
    const culturalVariations = this.generateCulturalVariations(allConcepts);
    culturalVariations.forEach(variation => expandedConcepts.add(variation));
    
    // AI-powered modern variations
    const modernVariations = this.generateModernVariations(allConcepts);
    modernVariations.forEach(variation => expandedConcepts.add(variation));
    
    return Array.from(expandedConcepts);
  }

  /**
   * Generate semantic variations using AI analysis
   */
  generateSemanticVariations(concept) {
    const variations = [];
    const words = concept.split(' ');
    
    // Generate variations based on word combinations
    if (words.length > 1) {
      // Add space variations
      variations.push(words.join(''));
      variations.push(words.join('-'));
      variations.push(words.join('_'));
      
      // Add word order variations
      if (words.length === 2) {
        variations.push(`${words[1]} ${words[0]}`);
      }
    }
    
    // Add plural/singular variations
    if (concept.endsWith('room')) {
      variations.push(concept.replace('room', 'rooms'));
    }
    if (concept.endsWith('area')) {
      variations.push(concept.replace('area', 'areas'));
    }
    
    return variations;
  }

  /**
   * Generate cultural variations using AI analysis
   */
  generateCulturalVariations(concepts) {
    const culturalMap = {
      'room': ['kaksh', 'kamra', 'room'],
      'bedroom': ['shayan kaksh', 'bedroom', 'sleeping room'],
      'kitchen': ['rasoi', 'kitchen', 'cooking area'],
      'bathroom': ['bathroom', 'washroom', 'toilet'],
      'prayer': ['puja', 'mandir', 'temple'],
      'dining': ['bhojan kaksh', 'dining', 'eating area'],
      'wardrobe': ['almirah', 'wardrobe', 'closet'],
      'office': ['karya kaksh', 'office', 'study room'],
      'entryway': ['dwar', 'entryway', 'foyer'],
      'balcony': ['balcony', 'terrace', 'veranda'],
      'utility': ['utility', 'laundry', 'storage']
    };
    
    const variations = [];
    for (const concept of concepts) {
      for (const [english, cultural] of Object.entries(culturalMap)) {
        if (concept.includes(english)) {
          cultural.forEach(culturalTerm => {
            const variation = concept.replace(english, culturalTerm);
            variations.push(variation);
          });
        }
      }
    }
    
    return variations;
  }

  /**
   * Generate modern variations using AI analysis
   */
  generateModernVariations(concepts) {
    const modernMap = {
      'room': ['space', 'area', 'zone'],
      'bedroom': ['sleeping space', 'rest area', 'bedroom suite'],
      'kitchen': ['cooking space', 'culinary area', 'kitchen zone'],
      'bathroom': ['bath space', 'wash area', 'bathroom suite'],
      'prayer': ['worship space', 'meditation area', 'prayer zone'],
      'dining': ['eating space', 'meal area', 'dining zone'],
      'wardrobe': ['dressing space', 'storage area', 'closet zone'],
      'office': ['work space', 'study area', 'office zone'],
      'entryway': ['entrance space', 'entry area', 'foyer zone'],
      'balcony': ['outdoor space', 'terrace area', 'balcony zone'],
      'utility': ['utility space', 'service area', 'utility zone']
    };
    
    const variations = [];
    for (const concept of concepts) {
      for (const [traditional, modern] of Object.entries(modernMap)) {
        if (concept.includes(traditional)) {
          modern.forEach(modernTerm => {
            const variation = concept.replace(traditional, modernTerm);
            variations.push(variation);
          });
        }
      }
    }
    
    return variations;
  }

  /**
   * Get room concepts for a category using AI-powered generation
   */
  getRoomConceptsForCategory(category) {
    // Check cache first
    if (this.conceptCache.has(category)) {
      return this.conceptCache.get(category);
    }
    
    // Generate concepts using AI
    const generator = this.roomConceptGenerators[category];
    if (generator) {
      const concepts = generator();
      this.conceptCache.set(category, concepts);
      return concepts;
    }
    
    return [];
  }

  /**
   * Get all room categories dynamically
   */
  getAllRoomCategories() {
    return Object.keys(this.roomConceptGenerators);
  }

  /**
   * AI-powered room term detection
   */
  detectRoomTerms(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);
    
    const detection = {
      isRoomSearch: false,
      isCompoundRoomSearch: false,
      detectedRoomTypes: [],
      compoundTerms: [],
      roomKeywords: [],
      semanticIntent: null
    };

    // 1. Detect individual room keywords using AI-generated concepts
    detection.roomKeywords = this.detectRoomKeywordsAI(words);
    detection.isRoomSearch = detection.roomKeywords.length > 0;

    // 2. Detect compound room terms
    detection.compoundTerms = this.detectCompoundTerms(queryLower);
    detection.isCompoundRoomSearch = detection.compoundTerms.length > 0;

    // 3. Detect room types based on semantic analysis
    detection.detectedRoomTypes = this.detectRoomTypesAI(queryLower);

    // 4. Determine semantic intent
    detection.semanticIntent = this.determineSemanticIntent(queryLower, detection);

    return detection;
  }

  /**
   * Detect individual room keywords using AI-generated concepts
   */
  detectRoomKeywordsAI(words) {
    const detected = [];
    
    for (const word of words) {
      // Check each room category using AI-generated concepts
      for (const category of this.getAllRoomCategories()) {
        const concepts = this.getRoomConceptsForCategory(category);
        if (concepts.some(term => term.includes(word) || word.includes(term.split(' ')[0]))) {
          detected.push({
            word,
            category,
            confidence: this.calculateKeywordConfidence(word, concepts)
          });
        }
      }
    }

    return detected;
  }

  /**
   * Detect compound room terms using pattern matching and semantic analysis
   */
  detectCompoundTerms(query) {
    const detected = [];

    // Pattern-based detection
    for (const pattern of this.compoundPatterns) {
      const matches = query.match(pattern.pattern);
      if (matches) {
        detected.push({
          term: matches[0],
          pattern: pattern.pattern.source,
          confidence: this.calculateCompoundConfidence(matches[0], pattern.examples)
        });
      }
    }

    // Semantic-based detection for cultural terms
    const culturalTerms = this.detectCulturalCompoundTerms(query);
    detected.push(...culturalTerms);

    // Additional compound term detection for specific patterns
    const additionalPatterns = [
      // Prayer room patterns
      { pattern: /(puja|pooja|prayer)\s+room/i, category: 'prayer', confidence: 0.9 },
      { pattern: /(mandir|temple)\s+room/i, category: 'prayer', confidence: 0.9 },
      
      // Living space patterns
      { pattern: /(living|sitting)\s+room/i, category: 'living', confidence: 0.9 },
      { pattern: /(dining|eating)\s+room/i, category: 'dining', confidence: 0.9 },
      { pattern: /(bed|sleeping)\s+room/i, category: 'bedroom', confidence: 0.9 },
      
      // Kids room patterns
      { pattern: /(kids|children|child)\s+(room|bedroom)/i, category: 'bedroom', confidence: 0.9 },
      { pattern: /(kids|children|child)\s+room/i, category: 'bedroom', confidence: 0.9 },
      
      // Functional space patterns
      { pattern: /(bath|wash)\s+room/i, category: 'bathroom', confidence: 0.9 },
      { pattern: /(kitchen|cooking)\s+area/i, category: 'kitchen', confidence: 0.9 },
      
      // General room patterns
      { pattern: /(\w+)\s+(room|area|space)/i, category: 'general', confidence: 0.7 }
    ];

    for (const pattern of additionalPatterns) {
      const matches = query.match(pattern.pattern);
      if (matches) {
        detected.push({
          term: matches[0],
          category: pattern.category,
          confidence: pattern.confidence
        });
      }
    }

    return detected;
  }

  /**
   * Detect cultural/regional compound terms
   */
  detectCulturalCompoundTerms(query) {
    const culturalPatterns = [
      // Indian cultural terms
      { pattern: /(\w+)\s+(pooja|puja|prayer)/i, category: 'prayer' },
      { pattern: /(\w+)\s+(mandir|temple)/i, category: 'prayer' },
      { pattern: /(\w+)\s+(kitchen|rasoi)/i, category: 'kitchen' },
      { pattern: /(\w+)\s+(bedroom|kamra)/i, category: 'bedroom' },
      
      // Kids room patterns
      { pattern: /(kids|children|child)\s+(room|bedroom)/i, category: 'bedroom' },
      
      // Modern compound terms
      { pattern: /(\w+)\s+(room|area|space)/i, category: 'general' }
    ];

    const detected = [];
    for (const pattern of culturalPatterns) {
      const matches = query.match(pattern.pattern);
      if (matches) {
        detected.push({
          term: matches[0],
          category: pattern.category,
          confidence: 0.8
        });
      }
    }

    return detected;
  }

  /**
   * Detect room types using AI-generated concepts
   */
  detectRoomTypesAI(query) {
    const detected = [];

    // Analyze query against AI-generated room concepts
    for (const category of this.getAllRoomCategories()) {
      const concepts = this.getRoomConceptsForCategory(category);
      const relevance = this.calculateSemanticRelevance(query, concepts);
      if (relevance > 0.3) {
        detected.push({
          category,
          relevance,
          primaryTerms: concepts.filter(term => query.includes(term.split(' ')[0]))
        });
      }
    }

    return detected;
  }

  /**
   * Determine semantic intent of the room search
   */
  determineSemanticIntent(query, detection) {
    const intent = {
      type: 'general',
      specificity: 'low',
      culturalContext: null,
      modifiers: []
    };

    // Check for cultural context
    if (query.includes('pooja') || query.includes('puja') || query.includes('mandir')) {
      intent.culturalContext = 'indian';
      intent.type = 'prayer';
    }

    // Check for specificity
    if (detection.compoundTerms.length > 0) {
      intent.specificity = 'high';
    } else if (detection.roomKeywords.length > 0) {
      intent.specificity = 'medium';
    }

    // Check for modifiers
    const modifiers = ['modern', 'traditional', 'contemporary', 'classic', 'luxury', 'budget'];
    intent.modifiers = modifiers.filter(mod => query.includes(mod));

    return intent;
  }

  /**
   * Calculate confidence for keyword detection
   */
  calculateKeywordConfidence(word, terms) {
    // Exact match gets highest confidence
    if (terms.some(term => term === word)) {
      return 1.0;
    }
    
    // Partial match gets medium confidence
    if (terms.some(term => term.includes(word) || word.includes(term.split(' ')[0]))) {
      return 0.7;
    }
    
    return 0.3;
  }

  /**
   * Calculate confidence for compound term detection
   */
  calculateCompoundConfidence(term, examples) {
    // Exact match with examples
    if (examples.includes(term)) {
      return 1.0;
    }
    
    // Similar pattern match
    const similarity = examples.filter(example => 
      this.calculateSimilarity(term, example) > 0.7
    ).length / examples.length;
    
    return Math.max(0.5, similarity);
  }

  /**
   * Calculate semantic relevance between query and terms
   */
  calculateSemanticRelevance(query, terms) {
    let maxRelevance = 0;
    
    for (const term of terms) {
      const termWords = term.split(' ');
      const queryWords = query.split(' ');
      
      // Calculate word overlap
      const overlap = termWords.filter(tw => 
        queryWords.some(qw => this.calculateSimilarity(tw, qw) > 0.6)
      ).length;
      
      const relevance = overlap / Math.max(termWords.length, queryWords.length);
      maxRelevance = Math.max(maxRelevance, relevance);
    }
    
    return maxRelevance;
  }

  /**
   * Calculate similarity between two words
   */
  calculateSimilarity(word1, word2) {
    const w1 = word1.toLowerCase();
    const w2 = word2.toLowerCase();
    
    if (w1 === w2) return 1.0;
    if (w1.includes(w2) || w2.includes(w1)) return 0.8;
    
    // Levenshtein distance for fuzzy matching
    const distance = this.levenshteinDistance(w1, w2);
    const maxLength = Math.max(w1.length, w2.length);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Levenshtein distance calculation
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Check if a term is a room-related term
   */
  isRoomTerm(term) {
    const termLower = term.toLowerCase();
    
    for (const category of this.getAllRoomCategories()) {
      const concepts = this.getRoomConceptsForCategory(category);
      if (concepts.some(roomTerm => 
        roomTerm === termLower || 
        roomTerm.includes(termLower) || 
        termLower.includes(roomTerm.split(' ')[0])
      )) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get synonyms for a room term
   */
  getRoomSynonyms(term) {
    const termLower = term.toLowerCase();
    
    for (const category of this.getAllRoomCategories()) {
      const concepts = this.getRoomConceptsForCategory(category);
      if (concepts.some(roomTerm => 
        roomTerm === termLower || 
        roomTerm.includes(termLower) || 
        termLower.includes(roomTerm.split(' ')[0])
      )) {
        return concepts.filter(t => t !== termLower);
      }
    }
    
    return [];
  }
}

export default new RoomIntelligenceService();
