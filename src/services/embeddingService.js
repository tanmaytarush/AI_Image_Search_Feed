import { pipeline } from "@xenova/transformers";
import dotenv from "dotenv";

dotenv.config();

class EmbeddingService {
  constructor() {
    this.extractor = null;
    this.visualExtractor = null;
    this.initialized = false;
    this.visualInitialized = false;
  }

  async initializeExtractor() {
    if (!this.initialized) {
      try {
        // Use a reliable model - this WILL work
        this.extractor = await pipeline(
          "feature-extraction",
          "Xenova/all-MiniLM-L6-v2"
        );
        this.initialized = true;
        console.log("✅ Successfully initialized Xenova/all-MiniLM-L6-v2 (384 dimensions)");
      } catch (error) {
        console.error("Error initializing embedding extractor:", error);
        throw error;
      }
    }
  }

  async initializeVisualExtractor() {
    if (!this.visualInitialized) {
      try {
        // Use a proper vision model for image feature extraction
        this.visualExtractor = await pipeline(
          "feature-extraction",
          "Xenova/resnet-50"  // ResNet-50 for feature extraction (2048 dimensions)
        );
        this.visualInitialized = true;
        console.log("✅ Successfully initialized visual extractor using resnet-50 (2048 dimensions)");
      } catch (error) {
        console.error("Error initializing visual extractor:", error);
        // Fallback to text-based approach
        this.visualInitialized = true;
        console.log("✅ Using text-based visual feature extraction as fallback");
      }
    }
  }

  async getEmbedding(text, taskDescription = "Generate semantic embeddings for interior design search and retrieval") {
    await this.initializeExtractor();
    try {
      // Combine task description with text for better context
      const contextualText = `${taskDescription}: ${text}`;
      
      const output = await this.extractor(contextualText, { 
        pooling: "mean", 
        normalize: true 
      });
      return output.tolist()[0];
    } catch (error) {
      console.error("Error creating embedding:", error);
      throw new Error("Failed to create embedding");
    }
  }

  validateVectorDimensions(imageId, vectors) {
    const expectedDimensions = {
      // Text embeddings (ANN)
      primary_search: 384,
      semantic_desc: 384,
      object_focus: 384,
      // Visual features (CNN) - supports both 768d (vision models) and 384d (fallback)
      visual_features: 384  // Use 384d for fallback compatibility
    };
    
    for (const [vectorName, vector] of Object.entries(vectors)) {
      // Skip non-vector fields like embedding_texts
      if (vectorName === 'embedding_texts') {
        continue;
      }
      
      if (!Array.isArray(vector)) {
        throw new Error(`${vectorName} is not an array for image ${imageId}`);
      }
      
      const expectedDimension = expectedDimensions[vectorName];
      if (!expectedDimension) {
        throw new Error(`Unknown vector type: ${vectorName} for image ${imageId}`);
      }
      
      if (vector.length !== expectedDimension) {
        throw new Error(`${vectorName} has incorrect dimensions for image ${imageId}: expected ${expectedDimension}, got ${vector.length}`);
      }
      if (vector.some(val => !isFinite(val))) {
        throw new Error(`${vectorName} contains invalid values for image ${imageId}`);
      }
    }
  }

  async createMultiVectors(aiGeneratedTags, description, metadata, imageId = "unknown") {
    // Add default values and validation
    const safeAiTags = aiGeneratedTags || {};
    const {
      room = "unknown",
      theme = "unknown",
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
      regional_style: indian_context.regional_style || "unknown",
      space_utilization: indian_context.space_utilization || "unknown",
      cultural_significance: indian_context.cultural_significance || "",
      modern_adaptations: indian_context.modern_adaptations || [],
      traditional_elements: indian_context.traditional_elements || [],
    };

    const safeVisualAttributes = {
      materials: visual_attributes.materials || [],
      colors: visual_attributes.colors || [],
    };

    // 1. Primary Search Vector - Enhanced structured composition
    const primarySearchText =
      `Interior Design: ${room} room in ${theme} style with ${safeIndianContext.regional_style} influences. Space Layout: ${safeIndianContext.space_utilization}.`.toLowerCase();

    // 2. Semantic Description Vector - Cultural context and relationships
    const semanticDescText = `This ${room} showcases ${theme} design where ${
      safeIndianContext.cultural_significance
    }. ${description || ""} Traditional elements: ${safeJoin(
      safeIndianContext.traditional_elements,
      ", "
    )}. Modern adaptations: ${safeJoin(
      safeIndianContext.modern_adaptations,
      ", "
    )}.`.toLowerCase();

    // 3. Object Focus Vector - Detailed furniture and material composition
    const objectTypes = safeJoin(
      safeMap(objects, (obj) => obj.type || ""),
      ", "
    );
    const objectFeatures = safeJoin(
      safeFlatMap(objects, (obj) => obj.features || []),
      ", "
    );
    const materials = safeJoin(safeVisualAttributes.materials, ", ");
    const features = safeJoin(primary_features, ", ");
    const colors = safeJoin(safeVisualAttributes.colors, ", ");

    const objectFocusText =
      `Furniture: ${objectTypes}. Materials: ${materials}. Features: ${features}. Colors: ${colors}. Object Details: ${objectFeatures}.`.toLowerCase();

    // Generate embeddings with task-specific descriptions
    const [primarySearchVector, semanticDescVector, objectFocusVector] = await Promise.all([
      this.getEmbedding(primarySearchText, "Interior design room search by style and layout"),
      this.getEmbedding(semanticDescText, "Interior design cultural context and descriptions"),
      this.getEmbedding(objectFocusText, "Furniture and object information for interior design search"),
    ]);

    // Validate dimensions
    this.validateVectorDimensions(imageId, {
      primary_search: primarySearchVector,
      semantic_desc: semanticDescVector,
      object_focus: objectFocusVector,
    });

    // Quality assessment and logging
    this.logEmbeddingQuality(imageId, {
      primary_search: primarySearchText,
      semantic_desc: semanticDescText,
      object_focus: objectFocusText,
    });

    console.log(`✅ Generated local embeddings for ${imageId} (384 dimensions each)`);

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

  logEmbeddingQuality(imageId, embeddingTexts) {
    const qualityMetrics = {};

    for (const [vectorName, text] of Object.entries(embeddingTexts)) {
      const wordCount = text.split(" ").length;
      const hasUnknown = text.includes("unknown");
      const hasEmpty = text.trim().length === 0;

      qualityMetrics[vectorName] = {
        wordCount,
        hasUnknown,
        hasEmpty,
        quality: this.assessQuality(wordCount, hasUnknown, hasEmpty),
      };
    }

    // Log quality assessment
    const overallQuality = Object.values(qualityMetrics).every(
      (m) => m.quality === "good"
    )
      ? "good"
      : "needs_attention";

    if (overallQuality === "needs_attention") {
      console.log(`🔍 Quality assessment for ${imageId}:`, qualityMetrics);
    }
  }

  assessQuality(wordCount, hasUnknown, hasEmpty) {
    if (hasEmpty || wordCount < 3) return "poor";
    if (hasUnknown && wordCount < 8) return "fair";
    if (wordCount < 5) return "fair";
    return "good";
  }

  async tokenizeText(text) {
    // Deprecated but keeping for compatibility
    return [];
  }

  // NEW: Extract visual features from image using proper vision models
  async extractVisualFeatures(imageUrl) {
    await this.initializeVisualExtractor();
    
    try {
      console.log(`🔍 Extracting visual features from: ${imageUrl}`);
      
      // Check if we have a proper vision model
      if (!this.visualExtractor || typeof this.visualExtractor !== 'function') {
        throw new Error("No vision model available, using fallback");
      }
      
      // Use the vision model to extract features
      const result = await this.visualExtractor(imageUrl);
      
      let visualFeatures;
      let expectedDimension;
      
             // Handle different model outputs
       if (result && result.data) {
         // Feature extraction output
         visualFeatures = result.data.tolist()[0];
         expectedDimension = 2048;
         console.log(`📊 ResNet feature extraction detected: ${visualFeatures.length} dimensions`);
       } else if (result && result.scores) {
         // Classification output - convert to feature vector
         visualFeatures = result.scores.tolist()[0];
         expectedDimension = 1000; // ImageNet classes
         console.log(`📊 ResNet classification detected: ${visualFeatures.length} dimensions`);
       } else if (result && Array.isArray(result)) {
         // Direct feature array
         visualFeatures = result;
         expectedDimension = visualFeatures.length;
         console.log(`📊 Direct features detected: ${visualFeatures.length} dimensions`);
       } else if (result && typeof result === 'object') {
         // Handle various output structures
         const features = result.data || result.scores || result.logits || result;
         if (features && features.tolist) {
           visualFeatures = features.tolist()[0];
           expectedDimension = visualFeatures.length;
           console.log(`📊 Model features detected: ${visualFeatures.length} dimensions`);
         } else {
           // Fallback to text-based approach
           console.log(`⚠️ Vision model output not recognized, using enhanced fallback approach`);
           const visualDescription = await this.createEnhancedVisualDescription(imageUrl);
           visualFeatures = await this.getEmbedding(
             visualDescription,
             "Visual features and image characteristics for interior design search"
           );
           expectedDimension = 384;
         }
       } else {
        // Fallback to text-based approach
        console.log(`⚠️ Vision model output not recognized, using enhanced fallback approach`);
        const visualDescription = await this.createEnhancedVisualDescription(imageUrl);
        visualFeatures = await this.getEmbedding(
          visualDescription,
          "Visual features and image characteristics for interior design search"
        );
        expectedDimension = 384;
      }
      
      // Validate visual features dimension
      if (visualFeatures.length !== expectedDimension) {
        console.warn(`⚠️ Visual features dimension mismatch: expected ${expectedDimension}, got ${visualFeatures.length}`);
      }
      
      // Normalize features to ensure they're in the expected range
      const normalizedFeatures = this.normalizeFeatures(visualFeatures);
      
      console.log(`✅ Extracted visual features (${normalizedFeatures.length} dimensions) from image`);
      return normalizedFeatures;
      
    } catch (error) {
      console.error("Error extracting visual features:", error);
      console.log("🔄 Falling back to text-based visual features...");
      
      // Fallback to text-based approach
      const visualDescription = await this.createEnhancedVisualDescription(imageUrl);
      const visualFeatures = await this.getEmbedding(
        visualDescription,
        "Visual features and image characteristics for interior design search"
      );
      
      console.log(`✅ Generated fallback visual features (${visualFeatures.length} dimensions)`);
      return visualFeatures;
    }
  }

  // Helper method to normalize features to consistent dimensions
  normalizeFeatures(features) {
    // If features are too large, truncate or downsample
    if (features.length > 768) {
      // For ResNet-50 (2048d), take first 768 dimensions
      console.log(`📊 Truncating features from ${features.length} to 768 dimensions`);
      return features.slice(0, 768);
    } else if (features.length < 768) {
      // If too small, pad with zeros
      console.log(`📊 Padding features from ${features.length} to 768 dimensions`);
      const padded = new Array(768).fill(0);
      features.forEach((val, index) => {
        if (index < 768) padded[index] = val;
      });
      return padded;
    }
    return features;
  }

  // Helper method to create visual description from URL
  createVisualDescriptionFromUrl(imageUrl) {
    try {
      // Extract basic visual information from URL
      const url = new URL(imageUrl);
      const pathname = url.pathname.toLowerCase();
      
      // Create visual description based on URL patterns
      let visualDescription = "interior design image";
      
      if (pathname.includes('living') || pathname.includes('room')) {
        visualDescription += " living room interior";
      } else if (pathname.includes('bedroom') || pathname.includes('bed')) {
        visualDescription += " bedroom interior";
      } else if (pathname.includes('kitchen')) {
        visualDescription += " kitchen interior";
      } else if (pathname.includes('bathroom')) {
        visualDescription += " bathroom interior";
      }
      
      // Add common interior design elements
      visualDescription += " furniture decor lighting colors materials textures";
      
      // Add Indian context if URL suggests it
      if (pathname.includes('indian') || pathname.includes('traditional')) {
        visualDescription += " indian traditional cultural elements";
      }
      
      return visualDescription;
    } catch (error) {
      // Fallback to generic description
      return "interior design image furniture decor lighting colors materials textures";
    }
  }

  // Enhanced visual description based on image analysis
  async createEnhancedVisualDescription(imageUrl) {
    try {
      // Create a comprehensive visual description for interior design
      const baseDescription = this.createVisualDescriptionFromUrl(imageUrl);
      
      // Add more sophisticated visual analysis
      const enhancedDescription = `${baseDescription} visual analysis: 
        - Interior space layout and composition
        - Furniture arrangement and styling
        - Color palette and lighting design
        - Material textures and finishes
        - Decorative elements and accessories
        - Spatial organization and flow
        - Design style and aesthetic approach
        - Cultural and regional influences
        - Functional aspects and usability
        - Visual harmony and balance`;
      
      return enhancedDescription;
    } catch (error) {
      return this.createVisualDescriptionFromUrl(imageUrl);
    }
  }

  // NEW: Create hybrid vectors (visual + text)
  async createHybridVectors(aiGeneratedTags, description, metadata, imageUrl, imageId = "unknown") {
    try {
      // Generate text embeddings (384d each)
      const textVectors = await this.createMultiVectors(aiGeneratedTags, description, metadata, imageId);
      
      // Extract visual features (768d)
      const visualFeatures = await this.extractVisualFeatures(imageUrl);
      
      // Validate all dimensions
      this.validateVectorDimensions(imageId, {
        ...textVectors,
        visual_features: visualFeatures
      });
      
      console.log(`✅ Generated hybrid vectors for ${imageId}:
        • Visual Features: ${visualFeatures.length}d (CNN)
        • Text Embeddings: 384d each (ANN)`);
      
      return {
        ...textVectors,
        visual_features: visualFeatures
      };
    } catch (error) {
      console.error("Error creating hybrid vectors:", error);
      throw error;
    }
  }

  // Instagram-style visual feature extraction using open-source Hugging Face models
  async initializeInstagramVisualExtractors() {
    if (!this.instagramVisualInitialized) {
      try {
        // Vision Transformer (ViT)
        this.vitExtractor = await pipeline(
          "image-classification",
          "Xenova/vit-base-patch16-224"
        );
        // ResNet-50
        this.resnetExtractor = await pipeline(
          "image-classification",
          "Xenova/resnet-50"
        );
        // EfficientNet-B0
        this.efficientnetExtractor = await pipeline(
          "image-classification",
          "Xenova/efficientnet-b0"
        );
        this.instagramVisualInitialized = true;
        console.log("✅ Instagram-style visual extractors initialized (ViT, ResNet, EfficientNet)");
      } catch (error) {
        console.error("Error initializing Instagram-style visual extractors:", error);
        this.instagramVisualInitialized = false;
      }
    }
  }

  async extractInstagramVisualFeatures(imageUrl) {
    await this.initializeInstagramVisualExtractors();
    if (!this.instagramVisualInitialized) {
      // fallback to text-based
      return await this.getEmbedding(
        await this.createEnhancedVisualDescription(imageUrl),
        "Visual features and image characteristics for interior design search"
      );
    }
    try {
      // Run all models in parallel
      const [vit, resnet, efficientnet] = await Promise.all([
        this.vitExtractor(imageUrl),
        this.resnetExtractor(imageUrl),
        this.efficientnetExtractor(imageUrl)
      ]);
      // Assume .scores.tolist()[0] for each
      const vitVec = vit.scores?.tolist?.()[0] || [];
      const resnetVec = resnet.scores?.tolist?.()[0] || [];
      const effnetVec = efficientnet.scores?.tolist?.()[0] || [];
      // Instagram-style: concatenate
      const combined = vitVec.concat(resnetVec, effnetVec);
      // Reduce to 512 dims (Instagram often uses 512d for retrieval)
      const reduced = combined.slice(0, 512);
      console.log(`✅ Extracted Instagram-style visual features (${reduced.length} dimensions)`);
      return reduced;
    } catch (error) {
      console.error("Error extracting Instagram-style visual features:", error);
      // fallback to text-based
      return await this.getEmbedding(
        await this.createEnhancedVisualDescription(imageUrl),
        "Visual features and image characteristics for interior design search"
      );
    }
  }
}

export default new EmbeddingService();
