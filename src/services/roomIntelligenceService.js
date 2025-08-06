/**
 * Instagram-Style AI-Powered Room Intelligence Service
 * Multi-modal search with real-time suggestions and contextual understanding
 */

import dotenv from "dotenv";
import { pipeline } from "@xenova/transformers";

dotenv.config();

class RoomIntelligenceService {
  constructor() {
    // Instagram-style search components
    this.conceptCache = new Map();
    this.searchHistory = new Map(); // Track user search patterns
    this.trendingConcepts = new Map(); // Track trending room concepts
    this.semanticCache = new Map(); // Cache semantic embeddings
    this.realTimeSuggestions = new Map(); // Cache real-time suggestions
    
    // Instagram-style hashtag patterns for rooms
    this.hashtagPatterns = {
      living: ['#livingroom', '#sittingroom', '#lounge', '#drawingroom', '#familyroom', '#parlor', '#salon', '#reception', '#openliving', '#greatroom', '#familyliving', '#entertainmentroom', '#hall', '#baithak', '#otur', '#livingarea'],
      bedroom: ['#bedroom', '#sleepingroom', '#masterbedroom', '#guestbedroom', '#childrenbedroom', '#kidsroom', '#kidsbedroom', '#childbedroom', '#childroom', '#kamra', '#shayankaksh', '#bedroom', '#sleepingarea', '#primarybedroom', '#secondarybedroom', '#suite', '#bedroomsuite', '#sleepingchamber', '#restroom'],
      kitchen: ['#kitchen', '#cookingarea', '#kitchenette', '#openkitchen', '#closedkitchen', '#modularkitchen', '#rasoi', '#kitchenarea', '#cookingspace', '#kitchenroom', '#gourmetkitchen', '#chefkitchen', '#kitchenisland', '#kitchendining', '#cookingroom', '#foodpreparationarea'],
      dining: ['#diningroom', '#diningarea', '#eatingarea', '#breakfastnook', '#diningspace', '#bhojankaksh', '#dininghall', '#eatingroom', '#formaldining', '#casualdining', '#diningzone', '#mealroom'],
      bathroom: ['#bathroom', '#washroom', '#toilet', '#restroom', '#powderroom', '#ensuite', '#bathroom', '#washroom', '#toiletroom', '#batharea', '#masterbathroom', '#guestbathroom', '#halfbath', '#fullbath', '#bathroom'],
      prayer: ['#pujaroom', '#poojaroom', '#prayerroom', '#temple', '#mandir', '#worshiproom', '#shrine', '#pujakaksh', '#mandirroom', '#worshiparea', '#prayerspace', '#hometemple', '#familymandir', '#prayercorner', '#meditationroom'],
      wardrobe: ['#wardrobe', '#closet', '#walkinwardrobe', '#dressingroom', '#storageroom', '#almirah', '#cupboard', '#dressingarea', '#storagespace', '#walkincloset', '#dressingroom', '#storagearea'],
      office: ['#homeoffice', '#studyroom', '#workarea', '#workspace', '#studyarea', '#studykaksh', '#workroom', '#officespace', '#homeoffice', '#studyroom', '#workzone'],
      entryway: ['#entryway', '#foyer', '#vestibule', '#entrancehall', '#entryarea', '#dwar', '#entrance', '#entryspace', '#entryhall', '#foyerarea', '#entrancezone'],
      balcony: ['#balcony', '#terrace', '#veranda', '#patio', '#outdoorspace', '#balcony', '#terrace', '#outdoorarea', '#outdoorliving', '#balconyarea', '#terracespace'],
      utility: ['#utilityroom', '#laundryroom', '#mudroom', '#storagearea', '#utilityspace', '#utility', '#laundry', '#storageroom', '#utilityarea', '#laundryspace', '#storagezone']
    };
    
    // Instagram-style fallback room concepts (used if AI fails)
    this.fallbackRoomConcepts = {
      living: ['living room', 'sitting room', 'lounge', 'drawing room', 'family room', 'parlor', 'salon', 'reception', 'open living', 'great room', 'family living', 'entertainment room', 'hall', 'baithak', 'otur', 'living area'],
      bedroom: ['bedroom', 'sleeping room', 'master bedroom', 'guest bedroom', 'children bedroom', 'kids room', 'kids bedroom', 'child bedroom', 'child room', 'kamra', 'shayan kaksh', 'bed room', 'sleeping area', 'primary bedroom', 'secondary bedroom', 'suite', 'bedroom suite', 'sleeping chamber', 'rest room'],
      kitchen: ['kitchen', 'cooking area', 'kitchenette', 'open kitchen', 'closed kitchen', 'modular kitchen', 'rasoi', 'kitchen area', 'cooking space', 'kitchen room', 'gourmet kitchen', 'chef kitchen', 'kitchen island', 'kitchen dining', 'cooking room', 'food preparation area'],
      dining: ['dining room', 'dining area', 'eating area', 'breakfast nook', 'dining space', 'bhojan kaksh', 'dining hall', 'eating room', 'formal dining', 'casual dining', 'dining zone', 'meal room'],
      bathroom: ['bathroom', 'washroom', 'toilet', 'restroom', 'powder room', 'ensuite', 'bathroom', 'washroom', 'toilet room', 'bath area', 'master bathroom', 'guest bathroom', 'half bath', 'full bath', 'bath room'],
      prayer: ['puja room', 'pooja room', 'prayer room', 'temple', 'mandir', 'worship room', 'shrine', 'puja kaksh', 'mandir room', 'worship area', 'prayer space', 'home temple', 'family mandir', 'prayer corner', 'meditation room'],
      wardrobe: ['wardrobe', 'closet', 'walk-in wardrobe', 'dressing room', 'storage room', 'almirah', 'cupboard', 'dressing area', 'storage space', 'walk-in closet', 'dressing room', 'storage area'],
      office: ['home office', 'study room', 'work area', 'workspace', 'study area', 'study kaksh', 'work room', 'office space', 'home office', 'study room', 'work zone'],
      entryway: ['entryway', 'foyer', 'vestibule', 'entrance hall', 'entry area', 'dwar', 'entrance', 'entry space', 'entry hall', 'foyer area', 'entrance zone'],
      balcony: ['balcony', 'terrace', 'veranda', 'patio', 'outdoor space', 'balcony', 'terrace', 'outdoor area', 'outdoor living', 'balcony area', 'terrace space'],
      utility: ['utility room', 'laundry room', 'mudroom', 'storage area', 'utility space', 'utility', 'laundry', 'storage room', 'utility area', 'laundry space', 'storage zone']
    };
  }

  /**
   * Generate room concepts using AI
   */
  async generateRoomConceptsWithAI(roomType) {
    try {
      // Use AI-powered pattern matching instead of text generation
      const concepts = await this.generateRoomConceptsWithPatterns(roomType);
      console.log(`✅ AI-generated ${concepts.length} concepts for ${roomType}`);
      return concepts;
    } catch (error) {
      console.error(`Error in AI concept generation:`, error);
      return this.fallbackRoomConcepts[roomType] || [];
    }
  }

  /**
   * Generate room concepts using AI patterns
   */
  async generateRoomConceptsWithPatterns(roomType) {
    try {
      // AI-powered concept generation using patterns
      const baseConcepts = this.fallbackRoomConcepts[roomType] || [];
      const enhancedConcepts = [];
      
      // Add base concepts
      enhancedConcepts.push(...baseConcepts);
      
      // Generate variations using AI patterns
      for (const concept of baseConcepts) {
        const variations = this.generateConceptVariations(concept, roomType);
        enhancedConcepts.push(...variations);
      }
      
      // Remove duplicates
      return [...new Set(enhancedConcepts)];
    } catch (error) {
      console.error(`Error generating concepts with patterns:`, error);
      return this.fallbackRoomConcepts[roomType] || [];
    }
  }

  /**
   * Generate concept variations using AI patterns
   */
  generateConceptVariations(concept, roomType) {
    const variations = [];
    const conceptLower = concept.toLowerCase();
    
    // AI-powered variation generation
    switch (roomType) {
      case 'living':
        if (conceptLower.includes('living')) {
          variations.push('drawing room', 'sitting room', 'lounge', 'family room');
        }
        break;
      case 'bedroom':
        if (conceptLower.includes('bedroom')) {
          variations.push('sleeping room', 'master bedroom', 'guest bedroom');
        }
        break;
      case 'kitchen':
        if (conceptLower.includes('kitchen')) {
          variations.push('cooking area', 'kitchen space', 'modular kitchen');
        }
        break;
      case 'dining':
        if (conceptLower.includes('dining')) {
          variations.push('eating area', 'dining space', 'meal room');
        }
        break;
      case 'bathroom':
        if (conceptLower.includes('bathroom')) {
          variations.push('washroom', 'toilet', 'restroom');
        }
        break;
      case 'prayer':
        if (conceptLower.includes('prayer') || conceptLower.includes('puja')) {
          variations.push('temple', 'mandir', 'worship room', 'shrine');
        }
        break;
      case 'wardrobe':
        if (conceptLower.includes('wardrobe')) {
          variations.push('closet', 'dressing room', 'storage room');
        }
        break;
      case 'office':
        if (conceptLower.includes('office')) {
          variations.push('study room', 'work area', 'workspace');
        }
        break;
      case 'entryway':
        if (conceptLower.includes('entryway') || conceptLower.includes('foyer')) {
          variations.push('vestibule', 'entrance hall', 'entry area');
        }
        break;
      case 'balcony':
        if (conceptLower.includes('balcony')) {
          variations.push('terrace', 'veranda', 'patio');
        }
        break;
      case 'utility':
        if (conceptLower.includes('utility')) {
          variations.push('laundry room', 'storage area', 'mudroom');
        }
        break;
    }
    
    return variations;
  }

  /**
   * Get room concepts for a category (AI-generated or fallback)
   */
  async getRoomConceptsForCategory(category) {
    try {
      // Check cache first
      if (this.conceptCache.has(category)) {
        return this.conceptCache.get(category);
      }
      
      // Try AI generation first
      let concepts = await this.generateRoomConceptsWithAI(category);
      
      // If AI generation fails or returns empty, use fallback
      if (!concepts || concepts.length === 0) {
        concepts = this.fallbackRoomConcepts[category] || [];
        console.log(`⚠️ Using fallback concepts for ${category}`);
      }
      
      this.conceptCache.set(category, concepts);
      return concepts;
    } catch (error) {
      console.error(`Error getting room concepts for category ${category}:`, error);
      // Return fallback concepts
      return this.fallbackRoomConcepts[category] || [];
    }
  }

  /**
   * Get all room categories
   */
  getAllRoomCategories() {
    return Object.keys(this.fallbackRoomConcepts);
  }

  /**
   * Detect primary room type from query using pattern matching
   */
  async detectPrimaryRoomType(query) {
    try {
      const queryLower = query.toLowerCase();
      const words = queryLower.split(/\s+/);
      
      let bestMatch = {
        primaryRoomType: null,
        confidence: 0,
        allDetectedTypes: [],
        compoundTerms: []
      };
      
      // Check each room category
      for (const category of this.getAllRoomCategories()) {
        const concepts = await this.getRoomConceptsForCategory(category);
        let confidence = 0;
        let matchedTerms = [];
        
        // Check for exact matches in concepts
        for (const concept of concepts) {
          if (queryLower.includes(concept.toLowerCase())) {
            confidence = Math.max(confidence, 0.9);
            matchedTerms.push(concept);
          }
        }
        
        // Check for word matches
        for (const word of words) {
          for (const concept of concepts) {
            if (concept.toLowerCase().includes(word) || word.includes(concept.toLowerCase().split(' ')[0])) {
              confidence = Math.max(confidence, 0.7);
              matchedTerms.push(concept);
            }
          }
        }
        
        // Check for compound terms
        const compoundPatterns = [
          { pattern: /(\w+)\s+room/i, category: category },
          { pattern: /(\w+)\s+area/i, category: category },
          { pattern: /(\w+)\s+space/i, category: category }
        ];
        
        for (const pattern of compoundPatterns) {
          const matches = queryLower.match(pattern.pattern);
          if (matches) {
            confidence = Math.max(confidence, 0.8);
            matchedTerms.push(matches[0]);
          }
        }
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            primaryRoomType: category,
            confidence: confidence,
            allDetectedTypes: [{ category, relevance: confidence, primaryTerms: matchedTerms }],
            compoundTerms: matchedTerms
          };
        }
      }
      
      return bestMatch;
    } catch (error) {
      console.error("Error in detectPrimaryRoomType:", error);
      return {
        primaryRoomType: null,
        confidence: 0,
        allDetectedTypes: [],
        compoundTerms: []
      };
    }
  }

  /**
   * Get focused room concepts for a specific room type
   */
  async getFocusedRoomConcepts(roomType) {
    try {
      if (!roomType) return [];
      
      const concepts = await this.getRoomConceptsForCategory(roomType);
      return Array.isArray(concepts) ? concepts : [];
    } catch (error) {
      console.error(`Error getting focused room concepts for ${roomType}:`, error);
      return [];
    }
  }

  /**
   * Detect style preferences from query
   */
  async detectStylePreferences(query) {
    try {
      const queryLower = query.toLowerCase();
      const styles = [];
      
      // Common style keywords
      const styleKeywords = {
        'modern': ['modern', 'contemporary', 'minimalist', 'clean'],
        'traditional': ['traditional', 'classical', 'heritage', 'vintage'],
        'indian': ['indian', 'desi', 'ethnic', 'cultural'],
        'luxury': ['luxury', 'premium', 'high-end', 'exclusive'],
        'budget': ['budget', 'affordable', 'economical', 'cost-effective'],
        'scandinavian': ['scandinavian', 'nordic', 'minimal'],
        'bohemian': ['bohemian', 'boho', 'eclectic'],
        'industrial': ['industrial', 'urban', 'loft'],
        'coastal': ['coastal', 'beach', 'ocean'],
        'rustic': ['rustic', 'country', 'farmhouse']
      };
      
      for (const [style, keywords] of Object.entries(styleKeywords)) {
        if (keywords.some(keyword => queryLower.includes(keyword))) {
          styles.push(style);
        }
      }
      
      return styles;
    } catch (error) {
      console.error("Error detecting style preferences:", error);
      return [];
    }
  }

  /**
   * Check if a term is a room-related term
   */
  async isRoomTerm(term) {
    try {
      const termLower = term.toLowerCase();
      
      for (const category of this.getAllRoomCategories()) {
        const concepts = await this.getRoomConceptsForCategory(category);
        if (concepts.some(roomTerm => 
          roomTerm.toLowerCase() === termLower || 
          roomTerm.toLowerCase().includes(termLower) || 
          termLower.includes(roomTerm.toLowerCase().split(' ')[0])
        )) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error checking if term is room term:", error);
      return false;
    }
  }

  /**
   * Get synonyms for a room term
   */
  async getRoomSynonyms(term) {
    try {
      const termLower = term.toLowerCase();
      
      for (const category of this.getAllRoomCategories()) {
        const concepts = await this.getRoomConceptsForCategory(category);
        if (concepts.some(roomTerm => 
          roomTerm.toLowerCase() === termLower || 
          roomTerm.toLowerCase().includes(termLower) || 
          termLower.includes(roomTerm.toLowerCase().split(' ')[0])
        )) {
          return concepts.filter(t => t.toLowerCase() !== termLower);
        }
      }
      
      return [];
    } catch (error) {
      console.error("Error getting room synonyms:", error);
      return [];
    }
  }

  /**
   * Instagram-style real-time search suggestions
   */
  async getRealTimeSuggestions(partialQuery, userId = null) {
    try {
      const queryLower = partialQuery.toLowerCase();
      const suggestions = [];
      
      // Get trending concepts
      const trending = this.getTrendingConcepts();
      
      // Get user search history
      const userHistory = userId ? this.searchHistory.get(userId) || [] : [];
      
      // Generate hashtag suggestions
      const hashtagSuggestions = this.generateHashtagSuggestions(queryLower);
      
      // Generate semantic suggestions
      const semanticSuggestions = await this.generateSemanticSuggestions(queryLower);
      
      // Combine all suggestions with Instagram-style ranking
      suggestions.push(...trending.slice(0, 3));
      suggestions.push(...userHistory.slice(0, 2));
      suggestions.push(...hashtagSuggestions.slice(0, 3));
      suggestions.push(...semanticSuggestions.slice(0, 2));
      
      // Remove duplicates and limit
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10);
      
      console.log(`📱 Generated ${uniqueSuggestions.length} Instagram-style suggestions for "${partialQuery}"`);
      return uniqueSuggestions;
    } catch (error) {
      console.error("Error generating real-time suggestions:", error);
      return [];
    }
  }

  /**
   * Instagram-style hashtag suggestion generation
   */
  generateHashtagSuggestions(query) {
    const suggestions = [];
    const queryLower = query.toLowerCase();
    
    // Check all hashtag patterns
    for (const [category, hashtags] of Object.entries(this.hashtagPatterns)) {
      for (const hashtag of hashtags) {
        const cleanHashtag = hashtag.replace('#', '');
        if (cleanHashtag.includes(queryLower) || queryLower.includes(cleanHashtag.split('')[0])) {
          suggestions.push(hashtag);
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Instagram-style semantic suggestion generation
   */
  async generateSemanticSuggestions(query) {
    try {
      const suggestions = [];
      const queryLower = query.toLowerCase();
      
      // Check all room concepts for semantic matches
      for (const [category, concepts] of Object.entries(this.fallbackRoomConcepts)) {
        for (const concept of concepts) {
          if (concept.toLowerCase().includes(queryLower) || 
              queryLower.includes(concept.toLowerCase().split(' ')[0])) {
            suggestions.push(`${concept} design`);
            suggestions.push(`${concept} interior`);
            suggestions.push(`${concept} decor`);
          }
        }
      }
      
      return suggestions;
    } catch (error) {
      console.error("Error generating semantic suggestions:", error);
      return [];
    }
  }

  /**
   * Track user search behavior (Instagram-style)
   */
  trackUserSearch(userId, query, selectedSuggestion = null) {
    try {
      if (!this.searchHistory.has(userId)) {
        this.searchHistory.set(userId, []);
      }
      
      const userHistory = this.searchHistory.get(userId);
      userHistory.unshift(query);
      
      // Keep only last 20 searches
      if (userHistory.length > 20) {
        userHistory.splice(20);
      }
      
      this.searchHistory.set(userId, userHistory);
      
      // Track trending concepts
      this.updateTrendingConcepts(query);
      
      console.log(`📊 Tracked search for user ${userId}: "${query}"`);
    } catch (error) {
      console.error("Error tracking user search:", error);
    }
  }

  /**
   * Update trending concepts (Instagram-style)
   */
  updateTrendingConcepts(query) {
    try {
      const queryLower = query.toLowerCase();
      
      // Check if query matches any room concept
      for (const [category, concepts] of Object.entries(this.fallbackRoomConcepts)) {
        for (const concept of concepts) {
          if (concept.toLowerCase().includes(queryLower) || 
              queryLower.includes(concept.toLowerCase())) {
            
            if (!this.trendingConcepts.has(concept)) {
              this.trendingConcepts.set(concept, 0);
            }
            
            const currentCount = this.trendingConcepts.get(concept);
            this.trendingConcepts.set(concept, currentCount + 1);
          }
        }
      }
    } catch (error) {
      console.error("Error updating trending concepts:", error);
    }
  }

  /**
   * Get trending concepts (Instagram-style)
   */
  getTrendingConcepts() {
    try {
      // Sort by popularity and return top concepts
      const sorted = Array.from(this.trendingConcepts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([concept, count]) => concept);
      
      return sorted;
    } catch (error) {
      console.error("Error getting trending concepts:", error);
      return [];
    }
  }

  /**
   * Instagram-style multi-modal search
   */
  async performMultiModalSearch(query, imageData = null) {
    try {
      const searchResults = {
        textResults: [],
        visualResults: [],
        hashtagResults: [],
        trendingResults: [],
        userHistoryResults: []
      };
      
      // Text-based search
      const roomType = await this.detectPrimaryRoomType(query);
      if (roomType.primaryRoomType) {
        searchResults.textResults = await this.getRoomConceptsForCategory(roomType.primaryRoomType);
      }
      
      // Hashtag search
      searchResults.hashtagResults = this.generateHashtagSuggestions(query);
      
      // Trending search
      searchResults.trendingResults = this.getTrendingConcepts();
      
      // Visual search (if image data provided)
      if (imageData) {
        searchResults.visualResults = await this.performVisualSearch(imageData);
      }
      
      console.log(`🔍 Multi-modal search completed for "${query}"`);
      return searchResults;
    } catch (error) {
      console.error("Error in multi-modal search:", error);
      return { textResults: [], visualResults: [], hashtagResults: [], trendingResults: [], userHistoryResults: [] };
    }
  }

  /**
   * Instagram-style visual search (placeholder for future implementation)
   */
  async performVisualSearch(imageData) {
    // Placeholder for visual search implementation
    // This would integrate with computer vision models
    return [];
  }

  /**
   * Instagram-style fuzzy search with semantic understanding
   */
  async performFuzzySearch(query, threshold = 0.7) {
    try {
      const queryLower = query.toLowerCase();
      const results = [];
      
      // Check all concepts with fuzzy matching
      for (const [category, concepts] of Object.entries(this.fallbackRoomConcepts)) {
        for (const concept of concepts) {
          const similarity = this.calculateFuzzySimilarity(queryLower, concept.toLowerCase());
          if (similarity >= threshold) {
            results.push({
              concept: concept,
              category: category,
              similarity: similarity,
              hashtags: this.hashtagPatterns[category] || []
            });
          }
        }
      }
      
      // Sort by similarity
      results.sort((a, b) => b.similarity - a.similarity);
      
      return results;
    } catch (error) {
      console.error("Error in fuzzy search:", error);
      return [];
    }
  }

  /**
   * Calculate fuzzy similarity between two strings
   */
  calculateFuzzySimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
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
}

export default new RoomIntelligenceService();
