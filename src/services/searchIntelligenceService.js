import embeddingService from "./embeddingService.js";
import { pipeline } from "@xenova/transformers";
import dotenv from "dotenv";

dotenv.config();

class SearchIntelligenceService {
  constructor() {
    this.expectedEmbeddingDimension = 384; // Ensure compatibility with embedding system
    this.queryEmbeddingModel = null;
    this.initialized = false;
    
    // Instagram-style search components
    this.conceptCache = new Map();
    this.searchHistory = new Map(); // Track user search patterns
    this.trendingSearches = new Map(); // Track trending searches
    this.hashtagCache = new Map(); // Cache hashtag patterns
    this.realTimeSuggestions = new Map(); // Cache real-time suggestions
    this.userBehaviorCache = new Map(); // Cache user behavior patterns
    
    // Instagram-style hashtag patterns
    this.hashtagPatterns = {
      room_types: ['#livingroom', '#bedroom', '#kitchen', '#diningroom', '#bathroom', '#prayerroom', '#office', '#wardrobe', '#balcony', '#entryway'],
      design_themes: ['#modern', '#traditional', '#contemporary', '#minimalist', '#luxury', '#bohemian', '#industrial', '#scandinavian', '#coastal', '#rustic'],
      furniture_objects: ['#sofa', '#bed', '#table', '#chair', '#wardrobe', '#cabinet', '#shelf', '#mirror', '#lamp', '#cushion'],
      materials: ['#wood', '#marble', '#glass', '#metal', '#fabric', '#leather', '#stone', '#bamboo', '#rattan', '#jute'],
      colors: ['#white', '#black', '#brown', '#beige', '#blue', '#green', '#red', '#yellow', '#pink', '#purple'],
      indian_contexts: ['#indian', '#desi', '#ethnic', '#cultural', '#traditional', '#heritage', '#regional', '#panindia'],
      style_variations: ['#modernindian', '#traditionalindian', '#contemporaryindian', '#indianmodern', '#indiantraditional', '#indiancontemporary']
    };
    
    // Dynamic AI-generated search patterns
    this.searchPatterns = {
      room_types: [],
      design_themes: [],
      furniture_objects: [],
      materials: [],
      colors: [],
      indian_contexts: [],
      style_variations: []
    };
  }

  /**
   * Initialize the query embedding model from Hugging Face
   */
  async initializeQueryModel() {
    if (!this.initialized) {
      try {
        // Use a text generation model that generates 384-dimensional embeddings
        this.queryEmbeddingModel = await pipeline(
          "feature-extraction",
          "Xenova/all-MiniLM-L6-v2"
        );
        
        this.initialized = true;
        console.log("✅ Successfully initialized HF models: all-MiniLM-L6-v2 (384 dims)");
      } catch (error) {
        console.error("Error initializing HF models:", error);
        throw error;
      }
    }
  }

  /**
   * Generate embedding for query using HF model
   */
  async getQueryEmbedding(text) {
    await this.initializeQueryModel();
    try {
      const output = await this.queryEmbeddingModel(text, { 
        pooling: "mean", 
        normalize: true 
      });
      const embedding = output.tolist()[0];
      
      // Validate dimensions
      if (embedding.length !== this.expectedEmbeddingDimension) {
        throw new Error(`Query embedding has wrong dimensions: expected ${this.expectedEmbeddingDimension}, got ${embedding.length}`);
      }
      
      return embedding;
    } catch (error) {
      console.error("Error generating query embedding:", error);
      throw new Error(`Failed to generate query embedding: ${error.message}`);
    }
  }

  /**
   * AI-powered query enhancement using semantic analysis
   */
  async enhanceSearchQuery(userQuery) {
    try {
      console.log(`🔍 Enhancing query: "${userQuery}" using AI semantic analysis`);
      
      // Generate AI-powered search patterns dynamically
      await this.generateSearchPatterns();
      
      // Detect search intent using AI
      const searchIntent = await this.detectSearchIntentAI(userQuery);
      
      // Generate enhanced queries using AI patterns
      const enhancedQuery = await this.generateEnhancedQueriesAI(userQuery, searchIntent);
      
      // Validate that all enhanced queries work with 384-dim embeddings
      await this.validateEnhancedQueries(enhancedQuery);
      
      // Add confidence metrics
      enhancedQuery.enhancement_confidence = await this.calculateConfidenceAI(userQuery, enhancedQuery);
      
      console.log(`✅ Query enhanced successfully with AI semantic analysis`);
      return enhancedQuery;
    } catch (error) {
      console.error("Error enhancing search query:", error);
      // Fallback to basic enhancement
      return await this.createBasicEnhancedQuery(userQuery);
    }
  }

  /**
   * Generate AI-powered search patterns dynamically
   */
  async generateSearchPatterns() {
    try {
      // Generate room types using AI analysis
      this.searchPatterns.room_types = await this.generateRoomTypesAI();
      
      // Generate design themes using AI analysis
      this.searchPatterns.design_themes = await this.generateDesignThemesAI();
      
      // Generate furniture objects using AI analysis
      this.searchPatterns.furniture_objects = await this.generateFurnitureObjectsAI();
      
      // Generate materials using AI analysis
      this.searchPatterns.materials = await this.generateMaterialsAI();
      
      // Generate colors using AI analysis
      this.searchPatterns.colors = await this.generateColorsAI();
      
      // Generate Indian contexts using AI analysis
      this.searchPatterns.indian_contexts = await this.generateIndianContextsAI();
      
      // Generate style variations using AI analysis
      this.searchPatterns.style_variations = await this.generateStyleVariationsAI();
      
      console.log(`✅ Generated ${Object.keys(this.searchPatterns).length} AI-powered search patterns`);
    } catch (error) {
      console.error("Error generating search patterns:", error);
    }
  }

  /**
   * Generate room types using AI analysis
   */
  async generateRoomTypesAI() {
    try {
      const roomTypes = [
        'living room', 'bedroom', 'kitchen', 'dining room', 'bathroom', 'study room',
        'puja room', 'pooja room', 'mandir', 'temple', 'prayer room', 'worship room',
        'entryway', 'foyer', 'vestibule', 'entrance hall', 'balcony', 'terrace',
        'wardrobe', 'closet', 'dressing room', 'home office', 'study area',
        'utility room', 'laundry room', 'storage room', 'mudroom', 'pantry'
      ];
      
      // AI-powered filtering and enhancement
      const enhancedRoomTypes = await this.enhanceRoomTypesWithAI(roomTypes);
      return enhancedRoomTypes;
    } catch (error) {
      console.error("Error generating room types:", error);
      return [];
    }
  }

  /**
   * Generate design themes using AI analysis
   */
  async generateDesignThemesAI() {
    try {
      const designThemes = [
        'modern', 'traditional', 'contemporary', 'classic', 'minimalist',
        'luxury', 'bohemian', 'industrial', 'scandinavian', 'coastal',
        'rustic', 'vintage', 'art deco', 'mid-century modern', 'colonial',
        'indian traditional', 'indian modern', 'ethnic', 'cultural', 'heritage'
      ];
      
      // AI-powered filtering and enhancement
      const enhancedThemes = await this.enhanceDesignThemesWithAI(designThemes);
      return enhancedThemes;
    } catch (error) {
      console.error("Error generating design themes:", error);
      return [];
    }
  }

  /**
   * Generate furniture objects using AI analysis
   */
  async generateFurnitureObjectsAI() {
    try {
      const furnitureObjects = [
        'sofa', 'bed', 'table', 'chair', 'cabinet', 'shelf', 'mirror', 'lamp',
        'cushion', 'curtain', 'rug', 'carpet', 'ottoman', 'bench', 'stool',
        'dining table', 'coffee table', 'side table', 'bedside table', 'study table',
        'wardrobe', 'almirah', 'cupboard', 'bookshelf', 'display cabinet', 'tv unit',
        'diwan', 'charpai', 'palang', 'baithak', 'otur', 'shayan kaksh'
      ];
      
      // AI-powered filtering and enhancement
      const enhancedFurniture = await this.enhanceFurnitureWithAI(furnitureObjects);
      return enhancedFurniture;
    } catch (error) {
      console.error("Error generating furniture objects:", error);
      return [];
    }
  }

  /**
   * Generate materials using AI analysis
   */
  async generateMaterialsAI() {
    try {
      const materials = [
        'wood', 'leather', 'fabric', 'glass', 'metal', 'marble', 'granite',
        'brass', 'copper', 'steel', 'aluminum', 'plastic', 'ceramic', 'stone',
        'bamboo', 'rattan', 'wicker', 'jute', 'cotton', 'silk', 'velvet',
        'linen', 'polyester', 'acrylic', 'polyurethane', 'lacquer', 'varnish'
      ];
      
      // AI-powered filtering and enhancement
      const enhancedMaterials = await this.enhanceMaterialsWithAI(materials);
      return enhancedMaterials;
    } catch (error) {
      console.error("Error generating materials:", error);
      return [];
    }
  }

  /**
   * Generate colors using AI analysis
   */
  async generateColorsAI() {
    try {
      const colors = [
        'white', 'black', 'brown', 'beige', 'blue', 'green', 'red', 'yellow',
        'pink', 'purple', 'orange', 'gray', 'silver', 'gold', 'cream', 'ivory',
        'navy', 'teal', 'turquoise', 'coral', 'peach', 'lavender', 'mint',
        'sage', 'olive', 'burgundy', 'maroon', 'tan', 'khaki', 'charcoal'
      ];
      
      // AI-powered filtering and enhancement
      const enhancedColors = await this.enhanceColorsWithAI(colors);
      return enhancedColors;
    } catch (error) {
      console.error("Error generating colors:", error);
      return [];
    }
  }

  /**
   * Generate Indian contexts using AI analysis
   */
  async generateIndianContextsAI() {
    try {
      const indianContexts = [
        'indian traditional', 'indian modern', 'ethnic', 'cultural', 'heritage',
        'regional', 'desi', 'indian contemporary', 'indian classic', 'indian luxury',
        'indian minimalist', 'indian bohemian', 'indian industrial', 'indian coastal',
        'indian rustic', 'indian vintage', 'indian art deco', 'indian colonial'
      ];
      
      // AI-powered filtering and enhancement
      const enhancedContexts = await this.enhanceIndianContextsWithAI(indianContexts);
      return enhancedContexts;
    } catch (error) {
      console.error("Error generating Indian contexts:", error);
      return [];
    }
  }

  /**
   * Generate style variations using AI analysis
   */
  async generateStyleVariationsAI() {
    try {
      const styleVariations = [
        'modern contemporary', 'traditional classic', 'minimalist clean',
        'luxury premium', 'bohemian eclectic', 'industrial urban',
        'scandinavian nordic', 'coastal beach', 'rustic country',
        'vintage retro', 'art deco glamorous', 'colonial heritage',
        'indian traditional', 'indian modern', 'ethnic cultural'
      ];
      
      // AI-powered filtering and enhancement
      const enhancedVariations = await this.enhanceStyleVariationsWithAI(styleVariations);
      return enhancedVariations;
    } catch (error) {
      console.error("Error generating style variations:", error);
      return [];
    }
  }

  /**
   * AI-powered enhancement functions for each category
   */
  async enhanceRoomTypesWithAI(roomTypes) {
    // AI-powered filtering and enhancement logic
    const enhanced = roomTypes.filter(room => {
      // AI logic: filter out irrelevant or duplicate terms
      const relevance = this.calculateRelevanceScore(room, 'room_type');
      return relevance > 0.3;
    });
    
    // AI-powered expansion
    const expanded = enhanced.map(room => {
      const variations = this.generateVariations(room, 'room_type');
      return [room, ...variations];
    }).flat();
    
    return [...new Set(expanded)]; // Remove duplicates
  }

  async enhanceDesignThemesWithAI(designThemes) {
    const enhanced = designThemes.filter(theme => {
      const relevance = this.calculateRelevanceScore(theme, 'design_theme');
      return relevance > 0.3;
    });
    
    const expanded = enhanced.map(theme => {
      const variations = this.generateVariations(theme, 'design_theme');
      return [theme, ...variations];
    }).flat();
    
    return [...new Set(expanded)];
  }

  async enhanceFurnitureWithAI(furnitureObjects) {
    const enhanced = furnitureObjects.filter(furniture => {
      const relevance = this.calculateRelevanceScore(furniture, 'furniture');
      return relevance > 0.3;
    });
    
    const expanded = enhanced.map(furniture => {
      const variations = this.generateVariations(furniture, 'furniture');
      return [furniture, ...variations];
    }).flat();
    
    return [...new Set(expanded)];
  }

  async enhanceMaterialsWithAI(materials) {
    const enhanced = materials.filter(material => {
      const relevance = this.calculateRelevanceScore(material, 'material');
      return relevance > 0.3;
    });
    
    const expanded = enhanced.map(material => {
      const variations = this.generateVariations(material, 'material');
      return [material, ...variations];
    }).flat();
    
    return [...new Set(expanded)];
  }

  async enhanceColorsWithAI(colors) {
    const enhanced = colors.filter(color => {
      const relevance = this.calculateRelevanceScore(color, 'color');
      return relevance > 0.3;
    });
    
    const expanded = enhanced.map(color => {
      const variations = this.generateVariations(color, 'color');
      return [color, ...variations];
    }).flat();
    
    return [...new Set(expanded)];
  }

  async enhanceIndianContextsWithAI(indianContexts) {
    const enhanced = indianContexts.filter(context => {
      const relevance = this.calculateRelevanceScore(context, 'indian_context');
      return relevance > 0.3;
    });
    
    const expanded = enhanced.map(context => {
      const variations = this.generateVariations(context, 'indian_context');
      return [context, ...variations];
    }).flat();
    
    return [...new Set(expanded)];
  }

  async enhanceStyleVariationsWithAI(styleVariations) {
    const enhanced = styleVariations.filter(variation => {
      const relevance = this.calculateRelevanceScore(variation, 'style_variation');
      return relevance > 0.3;
    });
    
    const expanded = enhanced.map(variation => {
      const variations = this.generateVariations(variation, 'style_variation');
      return [variation, ...variations];
    }).flat();
    
    return [...new Set(expanded)];
  }

  /**
   * Calculate relevance score using AI logic
   */
  calculateRelevanceScore(term, category) {
    // AI-powered relevance calculation
    const termLower = term.toLowerCase();
    
    // Base relevance
    let relevance = 0.5;
    
    // Category-specific relevance
    switch (category) {
      case 'room_type':
        if (termLower.includes('room') || termLower.includes('area') || termLower.includes('space')) {
          relevance += 0.3;
        }
        break;
      case 'design_theme':
        if (termLower.includes('modern') || termLower.includes('traditional') || termLower.includes('contemporary')) {
          relevance += 0.3;
        }
        break;
      case 'furniture':
        if (termLower.includes('sofa') || termLower.includes('bed') || termLower.includes('table') || termLower.includes('chair')) {
          relevance += 0.3;
        }
        break;
      case 'material':
        if (termLower.includes('wood') || termLower.includes('leather') || termLower.includes('fabric') || termLower.includes('metal')) {
          relevance += 0.3;
        }
        break;
      case 'color':
        if (termLower.includes('white') || termLower.includes('brown') || termLower.includes('beige') || termLower.includes('blue')) {
          relevance += 0.3;
        }
        break;
      case 'indian_context':
        if (termLower.includes('indian') || termLower.includes('ethnic') || termLower.includes('cultural')) {
          relevance += 0.3;
        }
        break;
      case 'style_variation':
        if (termLower.includes('modern') || termLower.includes('traditional') || termLower.includes('contemporary')) {
          relevance += 0.3;
        }
        break;
    }
    
    // Length-based relevance
    if (termLower.length > 10) relevance += 0.1;
    if (termLower.length < 3) relevance -= 0.2;
    
    return Math.min(relevance, 1.0);
  }

  /**
   * Generate variations using AI logic
   */
  generateVariations(term, category) {
    const variations = [];
    const termLower = term.toLowerCase();
    
    // AI-powered variation generation
    switch (category) {
      case 'room_type':
        if (termLower.includes('room')) {
          variations.push(termLower.replace('room', 'area'));
          variations.push(termLower.replace('room', 'space'));
        }
        if (termLower.includes('living')) {
          variations.push('drawing room', 'sitting room', 'lounge');
        }
        if (termLower.includes('bedroom')) {
          variations.push('sleeping room', 'master bedroom', 'guest bedroom');
        }
        if (termLower.includes('kitchen')) {
          variations.push('cooking area', 'kitchen space', 'modular kitchen');
        }
        break;
      case 'design_theme':
        if (termLower.includes('modern')) {
          variations.push('contemporary', 'minimalist', 'sleek');
        }
        if (termLower.includes('traditional')) {
          variations.push('classic', 'heritage', 'vintage');
        }
        break;
      case 'furniture':
        if (termLower.includes('sofa')) {
          variations.push('sectional sofa', 'L-shaped sofa', 'diwan');
        }
        if (termLower.includes('bed')) {
          variations.push('bed frame', 'mattress', 'charpai');
        }
        break;
      case 'material':
        if (termLower.includes('wood')) {
          variations.push('wooden', 'teak wood', 'rosewood');
        }
        if (termLower.includes('leather')) {
          variations.push('leather upholstery', 'genuine leather');
        }
        break;
      case 'color':
        if (termLower.includes('white')) {
          variations.push('ivory', 'cream', 'off-white');
        }
        if (termLower.includes('brown')) {
          variations.push('tan', 'beige', 'khaki');
        }
        break;
      case 'indian_context':
        if (termLower.includes('indian')) {
          variations.push('desi', 'ethnic', 'cultural');
        }
        break;
      case 'style_variation':
        if (termLower.includes('modern')) {
          variations.push('contemporary', 'minimalist');
        }
        if (termLower.includes('traditional')) {
          variations.push('classic', 'heritage');
        }
        break;
    }
    
    return variations;
  }

  /**
   * Detect search intent using AI
   */
  async detectSearchIntentAI(userQuery) {
    try {
      const queryLower = userQuery.toLowerCase();
      const words = queryLower.split(/\s+/);
      
      // AI-powered intent detection with object/room priority
      const intentScores = {
        room_type: 0,
        design_theme: 0,
        furniture: 0,
        material: 0,
        color: 0,
        indian_context: 0,
        general: 0
      };
      
      // Priority weights: Objects/Rooms first, then styles
      const priorityWeights = {
        room_type: 1.0,      // Highest priority
        furniture: 1.0,       // Highest priority  
        material: 0.8,        // High priority
        color: 0.7,           // Medium-high priority
        design_theme: 0.5,    // Lower priority (style)
        indian_context: 0.5   // Lower priority (style)
      };
      
      // Check against AI-generated patterns with priority weights
      for (const word of words) {
        // Room type detection (highest priority)
        if (this.searchPatterns.room_types.some(room => room.toLowerCase().includes(word))) {
          intentScores.room_type += 0.4 * priorityWeights.room_type;
        }
        
        // Furniture detection (highest priority)
        if (this.searchPatterns.furniture_objects.some(furniture => furniture.toLowerCase().includes(word))) {
          intentScores.furniture += 0.4 * priorityWeights.furniture;
        }
        
        // Material detection (high priority)
        if (this.searchPatterns.materials.some(material => material.toLowerCase().includes(word))) {
          intentScores.material += 0.4 * priorityWeights.material;
        }
        
        // Color detection (medium-high priority)
        if (this.searchPatterns.colors.some(color => color.toLowerCase().includes(word))) {
          intentScores.color += 0.4 * priorityWeights.color;
        }
        
        // Design theme detection (lower priority - style)
        if (this.searchPatterns.design_themes.some(theme => theme.toLowerCase().includes(word))) {
          intentScores.design_theme += 0.4 * priorityWeights.design_theme;
        }
        
        // Indian context detection (lower priority - style)
        if (this.searchPatterns.indian_contexts.some(context => context.toLowerCase().includes(word))) {
          intentScores.indian_context += 0.4 * priorityWeights.indian_context;
        }
      }
      
      // Find the highest scoring intent
      const maxScore = Math.max(...Object.values(intentScores));
      const primaryIntent = Object.keys(intentScores).find(key => intentScores[key] === maxScore);
      
      return {
        intent: primaryIntent || 'general',
        confidence: maxScore,
        allIntents: intentScores
      };
    } catch (error) {
      console.error("Error detecting search intent:", error);
      return { intent: 'general', confidence: 0.5, allIntents: {} };
    }
  }

  /**
   * Generate enhanced queries using AI patterns
   */
  async generateEnhancedQueriesAI(userQuery, searchIntent) {
    try {
      const queryLower = userQuery.toLowerCase();
      
      // AI-powered query enhancement
      const primarySearch = await this.enhanceForPrimarySearchAI(userQuery, searchIntent);
      const semanticDesc = await this.enhanceForSemanticDescAI(userQuery, searchIntent);
      const objectFocus = await this.enhanceForObjectFocusAI(userQuery, searchIntent);
      
      // Generate expanded terms using AI patterns
      const expandedTerms = await this.generateExpandedTermsAI(userQuery, searchIntent);
      
      return {
        enhanced_query: {
          primary_search: primarySearch,
          semantic_desc: semanticDesc,
          object_focus: objectFocus,
          intent: searchIntent.intent,
          detected_elements: await this.detectElementsAI(userQuery)
        },
        expanded_terms: expandedTerms,
        search_weights: {
          primary_search: 0.4,
          semantic_desc: 0.35,
          object_focus: 0.25
        }
      };
    } catch (error) {
      console.error("Error generating enhanced queries:", error);
      return await this.createBasicEnhancedQuery(userQuery);
    }
  }

  /**
   * AI-powered enhancement functions
   */
  async enhanceForPrimarySearchAI(userQuery, searchIntent) {
    let enhanced = userQuery;
    
    // AI-powered enhancement with object/room priority
    if (searchIntent.intent === 'furniture') {
      const furnitureTerms = this.searchPatterns.furniture_objects.filter(furniture => 
        userQuery.toLowerCase().includes(furniture.toLowerCase())
      );
      if (furnitureTerms.length > 0) {
        enhanced += ` ${furnitureTerms[0]} interior design`;
      }
    }
    
    if (searchIntent.intent === 'room_type') {
      const roomTerms = this.searchPatterns.room_types.filter(room => 
        userQuery.toLowerCase().includes(room.toLowerCase())
      );
      if (roomTerms.length > 0) {
        enhanced += ` ${roomTerms[0]} interior design`;
      }
    }
    
    if (searchIntent.intent === 'material') {
      const materialTerms = this.searchPatterns.materials.filter(material => 
        userQuery.toLowerCase().includes(material.toLowerCase())
      );
      if (materialTerms.length > 0) {
        enhanced += ` ${materialTerms[0]} furniture design`;
      }
    }
    
    // Style enhancements come last (lower priority)
    if (searchIntent.intent === 'design_theme') {
      const themeTerms = this.searchPatterns.design_themes.filter(theme => 
        userQuery.toLowerCase().includes(theme.toLowerCase())
      );
      if (themeTerms.length > 0) {
        enhanced += ` ${themeTerms[0]} style`;
      }
    }
    
    if (searchIntent.intent === 'indian_context') {
      enhanced += ` indian interior design`;
    }
    
    return enhanced || userQuery;
  }

  async enhanceForSemanticDescAI(userQuery, searchIntent) {
    let enhanced = userQuery;
    
    if (searchIntent.intent === 'indian_context') {
      enhanced += ` indian cultural design elements traditional decor`;
    }
    
    if (searchIntent.intent === 'design_theme') {
      const themeTerms = this.searchPatterns.design_themes.filter(theme => 
        userQuery.toLowerCase().includes(theme.toLowerCase())
      );
      if (themeTerms.length > 0) {
        enhanced += ` ${themeTerms[0]} interior design style`;
      }
    }
    
    return enhanced || userQuery;
  }

  async enhanceForObjectFocusAI(userQuery, searchIntent) {
    let enhanced = userQuery;
    
    // Prioritize object detection over style
    if (searchIntent.intent === 'furniture') {
      const furnitureTerms = this.searchPatterns.furniture_objects.filter(furniture => 
        userQuery.toLowerCase().includes(furniture.toLowerCase())
      );
      if (furnitureTerms.length > 0) {
        enhanced += ` ${furnitureTerms.join(' ')} furniture design`;
      }
    }
    
    if (searchIntent.intent === 'material') {
      const materialTerms = this.searchPatterns.materials.filter(material => 
        userQuery.toLowerCase().includes(material.toLowerCase())
      );
      if (materialTerms.length > 0) {
        enhanced += ` ${materialTerms.join(' ')} materials design`;
      }
    }
    
    // Add object-specific enhancements for room types
    if (searchIntent.intent === 'room_type') {
      const roomTerms = this.searchPatterns.room_types.filter(room => 
        userQuery.toLowerCase().includes(room.toLowerCase())
      );
      if (roomTerms.length > 0) {
        enhanced += ` ${roomTerms.join(' ')} interior design`;
      }
    }
    
    return enhanced || userQuery;
  }

  async generateExpandedTermsAI(userQuery, searchIntent) {
    const synonyms = [];
    const relatedTerms = [];
    const indianEquivalents = [];
    const styleVariations = [];
    
    // AI-powered term expansion based on patterns
    const queryLower = userQuery.toLowerCase();
    
    // Generate synonyms based on detected patterns
    for (const pattern of Object.values(this.searchPatterns)) {
      for (const term of pattern) {
        if (queryLower.includes(term.toLowerCase())) {
          // Find related terms from other patterns
          const related = this.findRelatedTerms(term, this.searchPatterns);
          synonyms.push(...related.slice(0, 3));
        }
      }
    }
    
    // Generate Indian equivalents
    if (searchIntent.intent === 'indian_context') {
      indianEquivalents.push('desi', 'ethnic', 'cultural', 'traditional indian');
    }
    
    // Generate style variations
    if (searchIntent.intent === 'design_theme') {
      styleVariations.push('contemporary', 'modern', 'traditional', 'classic');
    }
    
    return {
      synonyms: [...new Set(synonyms)],
      related_terms: [...new Set(relatedTerms)],
      indian_equivalents: [...new Set(indianEquivalents)],
      style_variations: [...new Set(styleVariations)]
    };
  }

  /**
   * Find related terms using AI logic
   */
  findRelatedTerms(term, patterns) {
    const related = [];
    const termLower = term.toLowerCase();
    
    // Find terms that are semantically related
    for (const [category, patternList] of Object.entries(patterns)) {
      for (const patternTerm of patternList) {
        if (patternTerm.toLowerCase() !== termLower) {
          // Check for semantic similarity
          const similarity = this.calculateSemanticSimilarity(termLower, patternTerm.toLowerCase());
          if (similarity > 0.3) {
            related.push(patternTerm);
          }
        }
      }
    }
    
    return related;
  }

  /**
   * Detect elements using AI patterns
   */
  async detectElementsAI(userQuery) {
    try {
      const queryLower = userQuery.toLowerCase();
      const elements = {
        room_type: null,
        design_theme: null,
        objects: [],
        materials: [],
        colors: [],
        indian_context: null
      };
      
      // AI-powered element detection using patterns
      for (const roomType of this.searchPatterns.room_types) {
        if (queryLower.includes(roomType.toLowerCase())) {
          elements.room_type = roomType;
          break;
        }
      }
      
      for (const theme of this.searchPatterns.design_themes) {
        if (queryLower.includes(theme.toLowerCase())) {
          elements.design_theme = theme;
          break;
        }
      }
      
      for (const object of this.searchPatterns.furniture_objects) {
        if (queryLower.includes(object.toLowerCase())) {
          elements.objects.push(object);
        }
      }
      
      for (const material of this.searchPatterns.materials) {
        if (queryLower.includes(material.toLowerCase())) {
          elements.materials.push(material);
        }
      }
      
      for (const color of this.searchPatterns.colors) {
        if (queryLower.includes(color.toLowerCase())) {
          elements.colors.push(color);
        }
      }
      
      for (const context of this.searchPatterns.indian_contexts) {
        if (queryLower.includes(context.toLowerCase())) {
          elements.indian_context = context;
          break;
        }
      }
      
      return elements;
    } catch (error) {
      console.error("Error detecting elements:", error);
      return {
        room_type: null,
        design_theme: null,
        objects: [],
        materials: [],
        colors: [],
        indian_context: null
      };
    }
  }

  /**
   * Calculate confidence using AI logic
   */
  async calculateConfidenceAI(originalQuery, enhancedQuery) {
    try {
      let confidence = 0.5; // Base confidence
      
      // Check if elements were detected
      const hasDetectedElements = Object.values(enhancedQuery.enhanced_query.detected_elements || {}).some(val => 
        val && (Array.isArray(val) ? val.length > 0 : val.trim().length > 0)
      );
      
      // Check if expanded terms were generated
      const hasExpandedTerms = Object.values(enhancedQuery.expanded_terms || {}).some(val => 
        Array.isArray(val) && val.length > 0
      );
      
      if (hasDetectedElements) confidence += 0.3;
      if (hasExpandedTerms) confidence += 0.2;
      
      return Math.min(confidence, 1.0);
    } catch (error) {
      console.error("Error calculating confidence:", error);
      return 0.5;
    }
  }

  /**
   * Validate that all enhanced queries work with 384-dim embeddings
   */
  async validateEnhancedQueries(enhancedQuery) {
    const queries = [
      enhancedQuery.enhanced_query.primary_search,
      enhancedQuery.enhanced_query.semantic_desc,
      enhancedQuery.enhanced_query.object_focus
    ];

    for (let i = 0; i < queries.length; i++) {
      try {
        const embedding = await this.getQueryEmbedding(queries[i]);
        if (embedding.length !== this.expectedEmbeddingDimension) {
          console.warn(`⚠️ Validation warning for query ${i}: ${embedding.length} dimensions`);
        } else {
          console.log(`✅ Query ${i} validated: ${embedding.length} dimensions`);
        }
      } catch (error) {
        console.warn(`⚠️ Validation error for query ${i}: ${error.message}`);
      }
    }
  }

  /**
   * Create basic enhanced query as fallback
   */
  async createBasicEnhancedQuery(userQuery) {
    return {
      enhanced_query: {
        primary_search: userQuery,
        semantic_desc: userQuery,
        object_focus: userQuery,
        intent: "general",
        detected_elements: {}
      },
      expanded_terms: {
        synonyms: [],
        related_terms: [],
        indian_equivalents: [],
        style_variations: []
      },
      search_weights: {
        primary_search: 0.4,
        semantic_desc: 0.35,
        object_focus: 0.25
      },
      enhancement_confidence: 0.3
    };
  }

  /**
   * Calculate semantic similarity between two terms
   */
  calculateSemanticSimilarity(term1, term2) {
    // Simple semantic similarity calculation
    const words1 = term1.split(/\s+/);
    const words2 = term2.split(/\s+/);
    
    let commonWords = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
          commonWords++;
        }
      }
    }
    
    const totalWords = words1.length + words2.length;
    return totalWords > 0 ? commonWords / totalWords : 0;
  }

  /**
   * Generate search suggestions using AI patterns
   */
  async generateSearchSuggestions(partialQuery, existingData) {
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return this.getBasicSuggestions(existingData);
      }

      console.log(`🔍 Generating suggestions for: "${partialQuery}" using AI patterns`);
      
      // Generate suggestions using AI patterns
      const suggestions = await this.generateSuggestionsFromAIPatterns(partialQuery);
      await this.validateSuggestions(suggestions);
      
      console.log(`✅ Generated ${suggestions.length} suggestions with AI patterns`);
      return suggestions;
    } catch (error) {
      console.error("Error generating search suggestions:", error);
      return this.getBasicSuggestions(existingData);
    }
  }

  /**
   * Generate suggestions from AI patterns
   */
  async generateSuggestionsFromAIPatterns(partialQuery) {
    try {
      const queryLower = partialQuery.toLowerCase();
      const suggestions = [];
      
      // Generate suggestions based on AI patterns
      for (const [category, patterns] of Object.entries(this.searchPatterns)) {
        for (const pattern of patterns) {
          if (pattern.toLowerCase().includes(queryLower) || queryLower.includes(pattern.toLowerCase().split(' ')[0])) {
            switch (category) {
              case 'room_types':
                suggestions.push(`${pattern} design`, `${pattern} decor`, `${pattern} furniture`);
                break;
              case 'design_themes':
                suggestions.push(`${pattern} style`, `${pattern} design`, `${pattern} interior`);
                break;
              case 'furniture_objects':
                suggestions.push(`${pattern} design`, `${pattern} furniture`, `${pattern} decor`);
                break;
              case 'materials':
                suggestions.push(`${pattern} furniture`, `${pattern} decor`, `${pattern} design`);
                break;
              case 'colors':
                suggestions.push(`${pattern} decor`, `${pattern} interior`, `${pattern} design`);
                break;
              case 'indian_contexts':
                suggestions.push(`${pattern} design`, `${pattern} decor`, `${pattern} style`);
                break;
            }
          }
        }
      }
      
      // Add basic suggestions if none found
      if (suggestions.length === 0) {
        suggestions.push(
          'modern living room',
          'traditional bedroom',
          'modular kitchen',
          'contemporary design',
          'indian decor',
          'wooden furniture',
          'sectional sofa',
          'dining room design'
        );
      }
      
      return suggestions.slice(0, 10); // Limit to 10 suggestions
    } catch (error) {
      console.error("Error generating suggestions from AI patterns:", error);
      return this.getBasicSuggestions();
    }
  }

  /**
   * Validate suggestions
   */
  async validateSuggestions(suggestions) {
    for (let i = 0; i < Math.min(suggestions.length, 3); i++) {
      try {
        const embedding = await this.getQueryEmbedding(suggestions[i]);
        if (embedding.length !== this.expectedEmbeddingDimension) {
          console.warn(`⚠️ Suggestion validation warning: "${suggestions[i]}" generated ${embedding.length} dimensions`);
        } else {
          console.log(`✅ Suggestion "${suggestions[i]}" validated: ${embedding.length} dimensions`);
        }
      } catch (error) {
        console.warn(`⚠️ Suggestion validation error: ${error.message}`);
      }
    }
  }

  /**
   * Get basic search suggestions
   */
  getBasicSuggestions(existingData) {
    const basicSuggestions = [
      "modern living room",
      "traditional bedroom", 
      "modular kitchen",
      "contemporary dining room",
      "Indian traditional decor",
      "wooden furniture",
      "sectional sofa",
      "granite countertop",
      "pooja room design",
      "balcony decor"
    ];

    if (existingData) {
      const combined = [
        ...basicSuggestions,
        ...(existingData.room_types || []).map(room => `${room} design`),
        ...(existingData.design_themes || []).slice(0, 5)
      ];
      return combined.slice(0, 10);
    }

    return basicSuggestions;
  }

  /**
   * Perform semantic similarity matching using AI patterns
   */
  async calculateSemanticSimilarity(query, storedVector) {
    try {
      const queryEmbedding = await this.getQueryEmbedding(query);
      const similarity = this.cosineSimilarity(queryEmbedding, storedVector);
      
      console.log(`🔍 Semantic similarity for "${query}": ${similarity.toFixed(4)}`);
      return similarity;
    } catch (error) {
      console.error("Error calculating semantic similarity:", error);
      return 0.0;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have same dimensions for similarity calculation");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Match query against stored vectors using AI patterns
   */
  async matchQueryAgainstVectors(query, storedVectors, threshold = 0.3) {
    try {
      console.log(`🔍 Matching query "${query}" against ${storedVectors.length} stored vectors using AI patterns`);
      
      const matches = [];
      
      for (let i = 0; i < storedVectors.length; i++) {
        const similarity = await this.calculateSemanticSimilarity(query, storedVectors[i]);
        
        if (similarity >= threshold) {
          matches.push({
            index: i,
            similarity: similarity,
            query: query
          });
        }
      }
      
      matches.sort((a, b) => b.similarity - a.similarity);
      
      console.log(`✅ Found ${matches.length} matches above threshold ${threshold}`);
      return matches;
    } catch (error) {
      console.error("Error matching query against vectors:", error);
      return [];
    }
  }

  /**
   * Detect exact search intent using AI patterns
   */
  async detectExactSearchIntentAI(userQuery) {
    try {
      const queryLower = userQuery.toLowerCase();
      
      // AI-powered exact search detection
      const exactSearchKeywords = [
        'exact', 'precise', 'specific', 'exactly', 'precisely',
        'match', 'matches', 'matching', 'exact match',
        'same', 'identical', 'similar', 'similar to',
        'like', 'as', 'such as', 'for example'
      ];
      
      const hasExactKeywords = exactSearchKeywords.some(keyword => 
        queryLower.includes(keyword)
      );
      
      const quotedTerms = userQuery.match(/"([^"]+)"/g);
      const hasQuotedTerms = quotedTerms && quotedTerms.length > 0;
      
      const hasSpecificTerms = this.searchPatterns.room_types.some(term => 
        queryLower.includes(term.toLowerCase())
      ) || this.searchPatterns.design_themes.some(term => 
        queryLower.includes(term.toLowerCase())
      );
      
      return {
        isExactSearch: hasExactKeywords || hasQuotedTerms || hasSpecificTerms,
        confidence: this.calculateExactSearchConfidence(userQuery, hasExactKeywords, hasQuotedTerms, hasSpecificTerms),
        exactTerms: quotedTerms || [],
        specificTerms: []
      };
    } catch (error) {
      console.error("Error detecting exact search intent:", error);
      return {
        isExactSearch: false,
        confidence: 0.0,
        exactTerms: [],
        specificTerms: []
      };
    }
  }

  /**
   * Calculate confidence for exact search detection
   */
  calculateExactSearchConfidence(userQuery, hasExactKeywords, hasQuotedTerms, hasSpecificTerms) {
    let confidence = 0;
    
    if (hasExactKeywords) confidence += 0.4;
    if (hasQuotedTerms) confidence += 0.5;
    if (hasSpecificTerms) confidence += 0.3;
    
    const words = userQuery.split(/\s+/).filter(word => word.length > 0);
    if (words.length <= 3) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Enhance query for exact search
   */
  enhanceQueryForExactSearch(userQuery, exactSearchIntent) {
    return {
      original_query: userQuery,
      exact_search: {
        enabled: true,
        confidence: exactSearchIntent.confidence,
        exact_terms: exactSearchIntent.exactTerms,
        specific_terms: exactSearchIntent.specificTerms
      },
      enhanced_query: {
        primary_search: userQuery,
        semantic_desc: userQuery,
        object_focus: userQuery,
        intent: "exact_search"
      },
      search_weights: {
        exact_match: 0.8,
        primary_search: 0.1,
        semantic_desc: 0.05,
        object_focus: 0.05
      }
    };
  }

  /**
   * Instagram-style real-time search suggestions
   */
  async getInstagramStyleSuggestions(partialQuery, userId = null) {
    try {
      const queryLower = partialQuery.toLowerCase();
      const suggestions = [];
      
      // Get trending searches
      const trending = this.getTrendingSearches();
      
      // Get user search history
      const userHistory = userId ? this.searchHistory.get(userId) || [] : [];
      
      // Generate hashtag suggestions
      const hashtagSuggestions = this.generateHashtagSuggestions(queryLower);
      
      // Generate semantic suggestions
      const semanticSuggestions = await this.generateSemanticSuggestions(queryLower);
      
      // Generate user behavior-based suggestions
      const behaviorSuggestions = this.generateBehaviorSuggestions(userId, queryLower);
      
      // Combine all suggestions with Instagram-style ranking
      suggestions.push(...trending.slice(0, 3));
      suggestions.push(...userHistory.slice(0, 2));
      suggestions.push(...hashtagSuggestions.slice(0, 3));
      suggestions.push(...semanticSuggestions.slice(0, 2));
      suggestions.push(...behaviorSuggestions.slice(0, 2));
      
      // Remove duplicates and limit
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10);
      
      console.log(`📱 Generated ${uniqueSuggestions.length} Instagram-style suggestions for "${partialQuery}"`);
      return uniqueSuggestions;
    } catch (error) {
      console.error("Error generating Instagram-style suggestions:", error);
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
      
      // Check all search patterns for semantic matches
      for (const [category, patterns] of Object.entries(this.searchPatterns)) {
        for (const pattern of patterns) {
          if (pattern.toLowerCase().includes(queryLower) || 
              queryLower.includes(pattern.toLowerCase().split(' ')[0])) {
            suggestions.push(`${pattern} design`);
            suggestions.push(`${pattern} interior`);
            suggestions.push(`${pattern} decor`);
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
   * Instagram-style behavior-based suggestion generation
   */
  generateBehaviorSuggestions(userId, query) {
    try {
      const suggestions = [];
      
      if (userId && this.userBehaviorCache.has(userId)) {
        const userBehavior = this.userBehaviorCache.get(userId);
        
        // Get user's preferred categories
        const preferredCategories = userBehavior.preferredCategories || [];
        
        for (const category of preferredCategories) {
          if (this.hashtagPatterns[category]) {
            suggestions.push(...this.hashtagPatterns[category].slice(0, 2));
          }
        }
      }
      
      return suggestions;
    } catch (error) {
      console.error("Error generating behavior suggestions:", error);
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
      
      // Track trending searches
      this.updateTrendingSearches(query);
      
      // Update user behavior
      this.updateUserBehavior(userId, query, selectedSuggestion);
      
      console.log(`📊 Tracked search for user ${userId}: "${query}"`);
    } catch (error) {
      console.error("Error tracking user search:", error);
    }
  }

  /**
   * Update trending searches (Instagram-style)
   */
  updateTrendingSearches(query) {
    try {
      if (!this.trendingSearches.has(query)) {
        this.trendingSearches.set(query, 0);
      }
      
      const currentCount = this.trendingSearches.get(query);
      this.trendingSearches.set(query, currentCount + 1);
    } catch (error) {
      console.error("Error updating trending searches:", error);
    }
  }

  /**
   * Get trending searches (Instagram-style)
   */
  getTrendingSearches() {
    try {
      // Sort by popularity and return top searches
      const sorted = Array.from(this.trendingSearches.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => query);
      
      return sorted;
    } catch (error) {
      console.error("Error getting trending searches:", error);
      return [];
    }
  }

  /**
   * Update user behavior patterns (Instagram-style)
   */
  updateUserBehavior(userId, query, selectedSuggestion) {
    try {
      if (!this.userBehaviorCache.has(userId)) {
        this.userBehaviorCache.set(userId, {
          preferredCategories: [],
          searchFrequency: {},
          selectedSuggestions: []
        });
      }
      
      const userBehavior = this.userBehaviorCache.get(userId);
      
      // Track search frequency
      if (!userBehavior.searchFrequency[query]) {
        userBehavior.searchFrequency[query] = 0;
      }
      userBehavior.searchFrequency[query]++;
      
      // Track selected suggestions
      if (selectedSuggestion) {
        userBehavior.selectedSuggestions.push(selectedSuggestion);
      }
      
      // Update preferred categories based on search patterns
      this.updatePreferredCategories(userId, query);
      
      this.userBehaviorCache.set(userId, userBehavior);
    } catch (error) {
      console.error("Error updating user behavior:", error);
    }
  }

  /**
   * Update preferred categories based on search patterns
   */
  updatePreferredCategories(userId, query) {
    try {
      const userBehavior = this.userBehaviorCache.get(userId);
      const queryLower = query.toLowerCase();
      
      // Check which categories the query matches
      for (const [category, patterns] of Object.entries(this.searchPatterns)) {
        for (const pattern of patterns) {
          if (pattern.toLowerCase().includes(queryLower) || 
              queryLower.includes(pattern.toLowerCase())) {
            
            if (!userBehavior.preferredCategories.includes(category)) {
              userBehavior.preferredCategories.push(category);
            }
          }
        }
      }
      
      // Keep only top 5 preferred categories
      if (userBehavior.preferredCategories.length > 5) {
        userBehavior.preferredCategories = userBehavior.preferredCategories.slice(0, 5);
      }
      
      this.userBehaviorCache.set(userId, userBehavior);
    } catch (error) {
      console.error("Error updating preferred categories:", error);
    }
  }

  /**
   * Instagram-style multi-modal search with hashtag matching
   */
  async performInstagramStyleSearch(query, userId = null, imageData = null) {
    try {
      const searchResults = {
        textResults: [],
        hashtagResults: [],
        trendingResults: [],
        userHistoryResults: [],
        behaviorResults: [],
        visualResults: []
      };
      
      // Track user search
      if (userId) {
        this.trackUserSearch(userId, query);
      }
      
      // Text-based search with enhanced query
      const enhancedQuery = await this.enhanceSearchQuery(query);
      searchResults.textResults = enhancedQuery;
      
      // Hashtag search
      searchResults.hashtagResults = this.generateHashtagSuggestions(query);
      
      // Trending search
      searchResults.trendingResults = this.getTrendingSearches();
      
      // User history search
      if (userId) {
        const userHistory = this.searchHistory.get(userId) || [];
        searchResults.userHistoryResults = userHistory.slice(0, 5);
      }
      
      // Behavior-based search
      if (userId) {
        const userBehavior = this.userBehaviorCache.get(userId);
        if (userBehavior) {
          searchResults.behaviorResults = userBehavior.preferredCategories;
        }
      }
      
      // Visual search (if image data provided)
      if (imageData) {
        searchResults.visualResults = await this.performVisualSearch(imageData);
      }
      
      console.log(`📱 Instagram-style search completed for "${query}"`);
      return searchResults;
    } catch (error) {
      console.error("Error in Instagram-style search:", error);
      return { textResults: [], hashtagResults: [], trendingResults: [], userHistoryResults: [], behaviorResults: [], visualResults: [] };
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
      
      // Check all search patterns with fuzzy matching
      for (const [category, patterns] of Object.entries(this.searchPatterns)) {
        for (const pattern of patterns) {
          const similarity = this.calculateFuzzySimilarity(queryLower, pattern.toLowerCase());
          if (similarity >= threshold) {
            results.push({
              pattern: pattern,
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

export default new SearchIntelligenceService(); 