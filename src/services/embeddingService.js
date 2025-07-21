import OpenAI from "openai";
import { AutoTokenizer } from '@xenova/transformers';
import dotenv from "dotenv";

dotenv.config();

class EmbeddingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.tokenizer = null;
    this.initializeTokenizer();
  }

  async initializeTokenizer() {
    try {
      this.tokenizer = await AutoTokenizer.from_pretrained('Xenova/all-MiniLM-L6-v2');
    } catch (error) {
      console.error("Error initializing tokenizer:", error);
    }
  }

  async createMultiVectors(aiGeneratedTags, description, metadata) {
    // Add default values and validation
    const safeAiTags = aiGeneratedTags || {};
    const {
      room = 'unknown',
      theme = 'unknown', 
      primary_features = [],
      objects = [],
      visual_attributes = {},
      indian_context = {},
    } = safeAiTags;

    // Safe array helpers
    const safeJoin = (arr, separator = " ") => {
      return Array.isArray(arr) ? arr.join(separator) : "";
    };

    const safeMap = (arr, mapFn) => {
      return Array.isArray(arr) ? arr.map(mapFn) : [];
    };

    const safeFlatMap = (arr, mapFn) => {
      return Array.isArray(arr) ? arr.flatMap(mapFn) : [];
    };

    // Safe access to nested properties
    const safeIndianContext = {
      regional_style: indian_context.regional_style || 'unknown',
      space_utilization: indian_context.space_utilization || 'unknown',
      cultural_significance: indian_context.cultural_significance || '',
      modern_adaptations: indian_context.modern_adaptations || [],
      traditional_elements: indian_context.traditional_elements || []
    };

    const safeVisualAttributes = {
      materials: visual_attributes.materials || [],
      colors: visual_attributes.colors || []
    };

    // 1. Primary Search Vector - Room, Theme, Regional Style
    const primarySearchText =
      `${room} ${theme} ${safeIndianContext.regional_style} ${safeIndianContext.space_utilization}`.toLowerCase();

    // 2. Semantic Description Vector - Detailed description and cultural context
    const semanticDescText = `${description || ''} ${
      safeIndianContext.cultural_significance
    } ${safeJoin(safeIndianContext.modern_adaptations)}`.toLowerCase();

    // 3. Object Focus Vector - Furniture, materials, features
    const objectTypes = safeJoin(safeMap(objects, (obj) => obj.type || ''));
    const objectFeatures = safeJoin(safeFlatMap(objects, (obj) => obj.features || []));
    const materials = safeJoin(safeVisualAttributes.materials);
    const features = safeJoin(primary_features);

    const objectFocusText =
      `${objectTypes} ${objectFeatures} ${materials} ${features} ${safeJoin(safeVisualAttributes.colors)}`.toLowerCase();

    // Generate all three embeddings
    const [primarySearchVector, semanticDescVector, objectFocusVector] =
      await Promise.all([
        this.getEmbedding(primarySearchText),
        this.getEmbedding(semanticDescText),
        this.getEmbedding(objectFocusText),
      ]);

    return {
      primary_search: primarySearchVector,
      semantic_desc: semanticDescVector,
      object_focus: objectFocusVector,
      embedding_texts: {
        primary_search: primarySearchText,
        semantic_desc: semanticDescText,
        object_focus: objectFocusText,
      },
    };
  }

  async getEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error creating embedding:", error);
      throw new Error("Failed to create embedding");
    }
  }

  async tokenizeText(text) {
    if (!this.tokenizer) {
      await this.initializeTokenizer();
    }
    
    try {
      const tokens = this.tokenizer.encode(text);
      return tokens;
    } catch (error) {
      console.error("Error tokenizing text:", error);
      throw new Error("Failed to tokenize text");
    }
  }


}

export default new EmbeddingService();
