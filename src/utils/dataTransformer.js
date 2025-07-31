import embeddingService from "../services/embeddingService.js";
import crypto from "crypto";

class DataTransformer {
  async transformToQdrantFormat(modelResponse) {
    try {
      const {
        image_id,
        ai_generated_tags,
        confidence_scores,
        metadata = {},
        description,
        error,
        raw_response
      } = modelResponse;

      // Check if this is a failed response
      if (error || raw_response) {
        console.warn(`⚠️ Skipping failed response for image ${image_id}: ${error || 'Invalid response'}`);
        return null; // Return null to filter out failed responses
      }

      // Validate ai_generated_tags
      if (!ai_generated_tags || typeof ai_generated_tags !== 'object') {
        console.warn(`Invalid ai_generated_tags for image ${image_id}:`, ai_generated_tags);
        return null; // Return null instead of throwing error
      }

      // Check if this is a template response (contains placeholder text)
      const isTemplate = (
        typeof ai_generated_tags.room === 'string' && 
        (ai_generated_tags.room.includes('Room Type (') || ai_generated_tags.room.includes('Living Room, Bedroom'))
      ) || (
        typeof ai_generated_tags.theme === 'string' && 
        (ai_generated_tags.theme.includes('Design Theme (') || ai_generated_tags.theme.includes('Traditional Indian'))
      );

      if (isTemplate) {
        console.warn(`❌ Template response detected for image ${image_id} - model returned placeholder text instead of real analysis`);
        throw new Error(`Template response detected for image ${image_id} - model needs to be retried with better prompt`);
      }

      // Generate hybrid vectors (visual + text) using local Transformers.js embeddings
      let multiVectors;
      try {
        multiVectors = await embeddingService.createHybridVectors(
          ai_generated_tags,
          description,
          metadata,
          modelResponse.imageUrl || modelResponse.url, // Add image URL for visual features
          image_id
        );
      } catch (error) {
        console.warn(`⚠️ Failed to create hybrid vectors for ${image_id}, falling back to text-only: ${error.message}`);
        // Fallback to text-only vectors if hybrid creation fails
        multiVectors = await embeddingService.createMultiVectors(
          ai_generated_tags,
          description,
          metadata,
          image_id
        );
        // Add empty visual features to maintain structure
        multiVectors.visual_features = new Array(384).fill(0);
      }

      // Validate multiVectors structure
      if (!multiVectors || typeof multiVectors !== 'object') {
        throw new Error(`Invalid multiVectors structure for image ${image_id}`);
      }

      const requiredVectors = ['primary_search', 'semantic_desc', 'object_focus', 'visual_features'];
      const expectedDimensions = {
        primary_search: 384,
        semantic_desc: 384,
        object_focus: 384,
        visual_features: 384
      };
      
      for (const vectorName of requiredVectors) {
        if (!multiVectors[vectorName] || !Array.isArray(multiVectors[vectorName])) {
          throw new Error(`Missing or invalid ${vectorName} vector for image ${image_id}`);
        }
        const expectedDim = expectedDimensions[vectorName];
        if (multiVectors[vectorName].length !== expectedDim) {
          throw new Error(`Invalid ${vectorName} vector dimension for image ${image_id}: expected ${expectedDim}, got ${multiVectors[vectorName].length}`);
        }
      }

      console.log(`✓ Generated valid hybrid embeddings for ${image_id}: ${Object.keys(multiVectors).filter(k => k !== 'embedding_texts').join(', ')}`);

      // Extract object types and features
      const objectTypes = ai_generated_tags.objects?.map((obj) =>
        obj.type.toLowerCase()
      ) || [];
      const objectFeatures = ai_generated_tags.objects?.flatMap(
        (obj) => obj.features
      ) || [];

      // Create search tags
      const searchTags = this.createSearchTags(ai_generated_tags, metadata);

      // Generate a valid Qdrant ID (hash the original ID to avoid special characters)
      const validId = this.generateValidId(image_id);

      return {
        id: validId,
        vectors: {
          // CNN-based visual features (768d)
          visual_features: multiVectors.visual_features,
          // ANN-based text embeddings (384d each)
          primary_search: multiVectors.primary_search,
          semantic_desc: multiVectors.semantic_desc,
          object_focus: multiVectors.object_focus,
        },
        payload: {
          // Multi-vector embedding texts (what was embedded)
          embedding_texts: multiVectors.embedding_texts,

          // Primary searchable fields
          room_type: ai_generated_tags.room?.toLowerCase() || 'unknown',
          design_theme: ai_generated_tags.theme?.toLowerCase() || 'unknown',
          regional_style:
            ai_generated_tags.indian_context?.regional_style?.toLowerCase() || 'unknown',
          space_utilization:
            ai_generated_tags.indian_context?.space_utilization?.toLowerCase() || 'unknown',

          // Multi-value arrays for filtering
          colors: ai_generated_tags.visual_attributes?.colors?.map((c) =>
            c.toLowerCase()
          ) || [],
          materials: ai_generated_tags.visual_attributes?.materials?.map((m) =>
            m.toLowerCase()
          ) || [],
          primary_features: ai_generated_tags.primary_features?.map((f) =>
            f.toLowerCase()
          ) || [],
          object_types: objectTypes,
          object_features: objectFeatures.map((f) => f.toLowerCase()),

          // Confidence scores
          confidence_scores: confidence_scores || {},

          // Budget and space classification
          budget_category: metadata.budget_indicator?.toLowerCase() || 'unknown',
          space_type: metadata.space_type?.toLowerCase() || 'unknown',
          functionality: metadata.functionality?.toLowerCase() || 'unknown',

          // Search optimization tags
          search_tags: searchTags,

          // Indian cultural context
          indian_specific: {
            traditional_elements:
              ai_generated_tags.indian_context?.traditional_elements || [],
            modern_adaptations:
              ai_generated_tags.indian_context?.modern_adaptations || [],
            cultural_significance:
              ai_generated_tags.indian_context?.cultural_significance || '',
          },

          // Full original analysis
          original_analysis: modelResponse,

          // Timestamp and metadata
          created_at: new Date().toISOString(),
          image_url: modelResponse.image_url || null,
          original_id: image_id, // Keep original ID for reference
          
          // Local embedding metadata
          embedding_model: "Xenova/all-MiniLM-L6-v2",
          vector_dimensions: 384,
          embedding_method: "local_transformers_js"
        },
      };
    } catch (error) {
      console.error("Error transforming data:", error);
      throw error;
    }
  }

  createSearchTags(aiGeneratedTags, metadata) {
    const tags = new Set();

    // Add basic tags
    if (aiGeneratedTags.room) tags.add(aiGeneratedTags.room.toLowerCase());
    if (aiGeneratedTags.theme) tags.add(aiGeneratedTags.theme.toLowerCase());
    if (aiGeneratedTags.indian_context?.space_utilization) 
      tags.add(aiGeneratedTags.indian_context.space_utilization.toLowerCase());

    // Add colors and materials
    aiGeneratedTags.visual_attributes?.colors?.forEach((color) =>
      tags.add(color.toLowerCase())
    );
    aiGeneratedTags.visual_attributes?.materials?.forEach((material) =>
      tags.add(material.toLowerCase())
    );

    // Add features
    aiGeneratedTags.primary_features?.forEach((feature) =>
      tags.add(feature.toLowerCase())
    );

    // Add object types
    aiGeneratedTags.objects?.forEach((obj) => {
      if (obj.type) tags.add(obj.type.toLowerCase());
      obj.features?.forEach((feature) => tags.add(feature.toLowerCase()));
    });

    // Add metadata tags
    if (metadata.tags) {
      metadata.tags.forEach((tag) => tags.add(tag.toLowerCase()));
    }

    return Array.from(tags);
  }

  generateValidId(originalId) {
    // Create a hash of the original ID to ensure it's a valid UUID
    const hash = crypto.createHash('md5').update(originalId).digest('hex');
    
    // Convert to UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  async transformBatch(modelResponses) {
    const transformedData = [];

    for (const response of modelResponses) {
      try {
        const transformed = await this.transformToQdrantFormat(response);
        if (transformed !== null) {
          transformedData.push(transformed);
        }
      } catch (error) {
        console.error(
          `Error transforming response for ${response.image_id}:`,
          error
        );
        // Continue with other items
      }
    }

    console.log(`📊 Transformed ${transformedData.length}/${modelResponses.length} responses using local embeddings (384 dimensions)`);
    return transformedData;
  }
}

export default new DataTransformer();
