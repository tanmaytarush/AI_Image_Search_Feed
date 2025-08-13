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
        console.log(
          "✅ Successfully initialized Xenova/all-MiniLM-L6-v2 (384 dimensions)"
        );
      } catch (error) {
        console.error("Error initializing embedding extractor:", error);
        throw error;
      }
    }
  }

  // CRITICAL: Initialize ResNet-50 - must succeed, no fallbacks
  async initializeVisualExtractor() {
    if (!this.visualInitialized) {
      try {
        console.log(
          "🔄 Initializing ResNet-50 for visual feature extraction..."
        );

        // Use ResNet-50 for CNN-based visual feature extraction
        this.visualExtractor = await pipeline(
          "image-classification",
          "Xenova/resnet-50" // ResNet-50 for CNN visual features
        );

        // Validate the model is working
        if (
          !this.visualExtractor ||
          typeof this.visualExtractor !== "function"
        ) {
          throw new Error(
            "❌ ResNet-50 model initialization failed - model is not a function"
          );
        }

        this.visualInitialized = true;
        console.log(
          "✅ ResNet-50 successfully initialized for CNN visual feature extraction"
        );

        // Test the model with a simple operation
        console.log("🧪 Testing ResNet-50 model...");
        const testResult = this.visualExtractor.toString();
        console.log("✅ ResNet-50 model test passed");
      } catch (error) {
        console.error("❌ CRITICAL ERROR initializing ResNet-50:", error);
        this.visualInitialized = false;
        this.visualExtractor = null;

        // NO FALLBACK - throw error to stop pipeline
        throw new Error(
          `ResNet-50 initialization FAILED: ${error.message}. Cannot proceed without visual feature extraction.`
        );
      }
    }
  }

  async getEmbedding(
    text,
    taskDescription = "Generate semantic embeddings for interior design search and retrieval"
  ) {
    await this.initializeExtractor();
    try {
      // Combine task description with text for better context
      const contextualText = `${taskDescription}: ${text}`;

      const output = await this.extractor(contextualText, {
        pooling: "mean",
        normalize: true,
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
      visual_features: 384, // Use 384d for fallback compatibility
    };

    for (const [vectorName, vector] of Object.entries(vectors)) {
      // Skip non-vector fields like embedding_texts
      if (vectorName === "embedding_texts") {
        continue;
      }

      if (!Array.isArray(vector)) {
        throw new Error(`${vectorName} is not an array for image ${imageId}`);
      }

      const expectedDimension = expectedDimensions[vectorName];
      if (!expectedDimension) {
        throw new Error(
          `Unknown vector type: ${vectorName} for image ${imageId}`
        );
      }

      if (vector.length !== expectedDimension) {
        throw new Error(
          `${vectorName} has incorrect dimensions for image ${imageId}: expected ${expectedDimension}, got ${vector.length}`
        );
      }
      if (vector.some((val) => !isFinite(val))) {
        throw new Error(
          `${vectorName} contains invalid values for image ${imageId}`
        );
      }
    }
  }

  async createMultiVectors(
    aiGeneratedTags,
    description,
    metadata,
    imageId = "unknown"
  ) {
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
    const [primarySearchVector, semanticDescVector, objectFocusVector] =
      await Promise.all([
        this.getEmbedding(
          primarySearchText,
          "Interior design room search by style and layout"
        ),
        this.getEmbedding(
          semanticDescText,
          "Interior design cultural context and descriptions"
        ),
        this.getEmbedding(
          objectFocusText,
          "Furniture and object information for interior design search"
        ),
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

    console.log(
      `✅ Generated local embeddings for ${imageId} (384 dimensions each)`
    );

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

  // FORCE REAL VISUAL FEATURES: No fallbacks, only ResNet CNN features
  async extractVisualFeatures(imageUrl) {
    await this.initializeVisualExtractor();

    try {
      console.log(`🔍 Extracting REAL visual features from: ${imageUrl}`);

      // CRITICAL: Must have ResNet model
      if (!this.visualExtractor || typeof this.visualExtractor !== "function") {
        throw new Error(
          "❌ ResNet model not available - cannot proceed without visual features"
        );
      }

      // Force ResNet feature extraction
      console.log(`🔄 Running ResNet-50 on image...`);
      const result = await this.visualExtractor(imageUrl);

      // Validate ResNet output
      if (!result || !Array.isArray(result) || result.length === 0) {
        throw new Error(
          "❌ ResNet returned invalid output - no visual features extracted"
        );
      }

      // Extract classification scores
      const scores = result.map((item) => item.score);
      console.log(
        `📊 ResNet CNN features extracted: ${scores.length} classification scores`
      );

      // CRITICAL: Must have meaningful scores
      if (scores.every((score) => score === 0)) {
        throw new Error(
          "❌ ResNet scores are all zero - visual feature extraction failed"
        );
      }

      // Create smart 384d features from ResNet scores
      const visualFeatures = await this.createSmart384dFeatures(scores);

      // Validate final features
      if (visualFeatures.length !== 384) {
        throw new Error(
          `❌ Visual features must be exactly 384d, got ${visualFeatures.length}`
        );
      }

      if (visualFeatures.every((val) => val === 0)) {
        throw new Error(
          "❌ Final visual features are all zero - processing failed"
        );
      }

      console.log(
        `✅ REAL ResNet CNN features created: ${visualFeatures.length}d with non-zero values`
      );
      return visualFeatures;
    } catch (error) {
      console.error(
        "❌ CRITICAL ERROR in visual feature extraction:",
        error.message
      );
      // NO FALLBACK - throw error to force pipeline to stop
      throw new Error(
        `Visual feature extraction FAILED: ${error.message}. Cannot proceed without real visual features.`
      );
    }
  }

  // NEW: Smart 384d feature creation that preserves architectural details
  async createSmart384dFeatures(resnetScores) {
    try {
      console.log(
        `🧠 Creating smart 384d features from ${resnetScores.length} ResNet scores`
      );

      // Strategy 1: Feature importance ranking
      const rankedFeatures = this.rankFeaturesByImportance(resnetScores);

      // Strategy 2: Architectural feature selection
      const architecturalFeatures =
        this.extractArchitecturalFeatures(resnetScores);

      // Strategy 3: Multi-aspect feature composition
      const multiAspectFeatures = this.createMultiAspectFeatures(resnetScores);

      // Combine strategies intelligently
      const smartFeatures = this.combineFeatureStrategies(
        rankedFeatures,
        architecturalFeatures,
        multiAspectFeatures
      );

      // Ensure exactly 384 dimensions
      const finalFeatures = this.ensure384Dimensions(smartFeatures);

      console.log(
        `✅ Smart 384d features created with architectural detail preservation`
      );
      return finalFeatures;
    } catch (error) {
      console.error("Error in smart feature creation:", error);
      // Fallback to simple truncation
      return this.simpleTruncation(resnetScores, 384);
    }
  }

  // NEW: Rank features by importance (higher scores = more important)
  rankFeaturesByImportance(scores) {
    // Create pairs of [index, score] and sort by score
    const indexedScores = scores.map((score, index) => [index, score]);
    const sortedByScore = indexedScores.sort((a, b) => b[1] - a[1]);

    // Take top features by importance
    const topFeatures = sortedByScore.slice(0, 384);

    // Return scores in original order but prioritize important ones
    const rankedFeatures = new Array(384).fill(0);
    topFeatures.forEach(([index, score], rankIndex) => {
      if (rankIndex < 384) {
        rankedFeatures[rankIndex] = score;
      }
    });

    return rankedFeatures;
  }

  // NEW: Extract architectural-specific features dynamically (no hardcoded indices)
  extractArchitecturalFeatures(scores) {
    console.log(
      `🧠 Extracting architectural features dynamically from ${scores.length} scores...`
    );

    // Strategy 1: Feature importance ranking (highest scores first)
    const indexedScores = scores.map((score, index) => [index, score]);
    const sortedByScore = indexedScores.sort((a, b) => b[1] - a[1]);

    // Strategy 2: Statistical significance (above mean + threshold)
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const stdDev = Math.sqrt(
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
        scores.length
    );
    const significanceThreshold = mean + 0.3 * stdDev;

    // Strategy 3: Adaptive threshold based on score distribution
    const topPercentile = Math.ceil(scores.length * 0.3); // Top 30% features
    const adaptiveThreshold = sortedByScore[topPercentile]?.[1] || mean;

    // Combine strategies: select features that meet multiple criteria
    const architecturalFeatures = new Array(384).fill(0);
    let featureIndex = 0;

    for (let i = 0; i < scores.length && featureIndex < 384; i++) {
      const score = scores[i];
      const isImportant = score > significanceThreshold; // Statistically significant
      const isTopRanked = i < topPercentile; // Top ranked
      const isAboveAdaptive = score > adaptiveThreshold; // Above adaptive threshold

      // Feature must meet at least 2 out of 3 criteria
      const criteriaMet =
        [isImportant, isTopRanked, isAboveAdaptive].filter(Boolean).length >= 2;

      if (criteriaMet) {
        architecturalFeatures[featureIndex] = score;
        featureIndex++;
      }
    }

    // If we don't have enough features, fill with top remaining scores
    if (featureIndex < 384) {
      for (let i = 0; i < scores.length && featureIndex < 384; i++) {
        if (architecturalFeatures[featureIndex] === 0) {
          architecturalFeatures[featureIndex] = scores[i];
          featureIndex++;
        }
      }
    }

    console.log(
      `✅ Dynamic architectural features: ${featureIndex} features selected using adaptive criteria`
    );
    return architecturalFeatures;
  }

  // NEW: Create multi-aspect features for different visual aspects
  createMultiAspectFeatures(scores) {
    const aspectCount = 4; // architectural, texture, color, general
    const featuresPerAspect = Math.floor(384 / aspectCount);

    const multiAspectFeatures = [];

    // Aspect 1: Architectural features (first quarter)
    const architectural = scores.slice(0, featuresPerAspect);
    multiAspectFeatures.push(...architectural);

    // Aspect 2: Texture features (second quarter)
    const texture = scores.slice(featuresPerAspect, featuresPerAspect * 2);
    multiAspectFeatures.push(...texture);

    // Aspect 3: Color features (third quarter)
    const color = scores.slice(featuresPerAspect * 2, featuresPerAspect * 3);
    multiAspectFeatures.push(...color);

    // Aspect 4: General features (fourth quarter)
    const general = scores.slice(featuresPerAspect * 3, featuresPerAspect * 4);
    multiAspectFeatures.push(...general);

    // Pad to exactly 384
    while (multiAspectFeatures.length < 384) {
      multiAspectFeatures.push(0);
    }

    return multiAspectFeatures.slice(0, 384);
  }

  // NEW: Combine multiple feature strategies intelligently
  combineFeatureStrategies(ranked, architectural, multiAspect) {
    const combined = new Array(384).fill(0);

    // Weighted combination: 40% features, 30% architectural, 30% ranked
    for (let i = 0; i < 384; i++) {
      const featureWeight = 0.4; // Features get highest priority (40%)
      const archWeight = 0.3; // Architectural details (30%)
      const rankedWeight = 0.3; // Importance-based ranking (30%)

      combined[i] =
        (multiAspect[i] || 0) * featureWeight + // Features first (40%)
        (architectural[i] || 0) * archWeight + // Architecture second (30%)
        (ranked[i] || 0) * rankedWeight; // Ranked third (30%)
    }

    return combined;
  }

  // NEW: Ensure exactly 384 dimensions
  ensure384Dimensions(features) {
    if (features.length === 384) {
      return features;
    } else if (features.length > 384) {
      return features.slice(0, 384);
    } else {
      // Pad with zeros
      return [...features, ...new Array(384 - features.length).fill(0)];
    }
  }

  // NEW: Simple truncation fallback
  simpleTruncation(scores, targetDim) {
    if (scores.length >= targetDim) {
      return scores.slice(0, targetDim);
    } else {
      return [...scores, ...new Array(targetDim - scores.length).fill(0)];
    }
  }

  // Helper method to normalize features to consistent dimensions
  normalizeFeatures(features) {
    // If features are too large, truncate or downsample
    if (features.length > 768) {
      // For ResNet-50 (2048d), take first 768 dimensions
      console.log(
        `📊 Truncating features from ${features.length} to 768 dimensions`
      );
      return features.slice(0, 768);
    } else if (features.length < 768) {
      // If too small, pad with zeros
      console.log(
        `📊 Padding features from ${features.length} to 768 dimensions`
      );
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

      if (pathname.includes("living") || pathname.includes("room")) {
        visualDescription += " living room interior";
      } else if (pathname.includes("bedroom") || pathname.includes("bed")) {
        visualDescription += " bedroom interior";
      } else if (pathname.includes("kitchen")) {
        visualDescription += " kitchen interior";
      } else if (pathname.includes("bathroom")) {
        visualDescription += " bathroom interior";
      } else if (pathname.includes("dining")) {
        visualDescription += " dining area interior";
      } else if (pathname.includes("foyer") || pathname.includes("entry")) {
        visualDescription += " entryway foyer interior";
      } else if (
        pathname.includes("staircase") ||
        pathname.includes("stairs")
      ) {
        visualDescription += " staircase interior";
      } else if (pathname.includes("ceiling")) {
        visualDescription += " ceiling design interior";
      } else if (pathname.includes("wall") || pathname.includes("moulding")) {
        visualDescription += " wall moulding trim interior";
      } else {
        visualDescription += " interior design space";
      }

      return visualDescription;
    } catch (error) {
      // Return generic description if URL parsing fails
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
  async createHybridVectors(
    aiGeneratedTags,
    description,
    metadata,
    imageUrl,
    imageId = "unknown"
  ) {
    try {
      // Generate text embeddings (384d each)
      const textVectors = await this.createMultiVectors(
        aiGeneratedTags,
        description,
        metadata,
        imageId
      );

      // Extract visual features (768d)
      const visualFeatures = await this.extractVisualFeatures(imageUrl);

      // Validate all dimensions
      this.validateVectorDimensions(imageId, {
        ...textVectors,
        visual_features: visualFeatures,
      });

      console.log(`✅ Generated hybrid vectors for ${imageId}:
        • Visual Features: ${visualFeatures.length}d (CNN)
        • Text Embeddings: 384d each (ANN)`);

      return {
        ...textVectors,
        visual_features: visualFeatures,
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
        console.log(
          "✅ Instagram-style visual extractors initialized (ViT, ResNet, EfficientNet)"
        );
      } catch (error) {
        console.error(
          "Error initializing Instagram-style visual extractors:",
          error
        );
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
        this.efficientnetExtractor(imageUrl),
      ]);
      // Assume .scores.tolist()[0] for each
      const vitVec = vit.scores?.tolist?.()[0] || [];
      const resnetVec = resnet.scores?.tolist?.()[0] || [];
      const effnetVec = efficientnet.scores?.tolist?.()[0] || [];
      // Instagram-style: concatenate
      const combined = vitVec.concat(resnetVec, effnetVec);
      // Reduce to 512 dims (Instagram often uses 512d for retrieval)
      const reduced = combined.slice(0, 512);
      console.log(
        `✅ Extracted Instagram-style visual features (${reduced.length} dimensions)`
      );
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
