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
      } = modelResponse;

      // Validate ai_generated_tags
      if (!ai_generated_tags || typeof ai_generated_tags !== 'object') {
        console.warn(`Invalid ai_generated_tags for image ${image_id}:`, ai_generated_tags);
        throw new Error(`Invalid ai_generated_tags structure for image ${image_id}`);
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
        console.warn(`Skipping template response for image ${image_id}`);
        throw new Error(`Template response detected for image ${image_id}, skipping`);
      }

      // Generate multi-vectors
      const multiVectors = await embeddingService.createMultiVectors(
        ai_generated_tags,
        description,
        metadata
      );

      // Validate multiVectors structure
      if (!multiVectors || typeof multiVectors !== 'object') {
        throw new Error(`Invalid multiVectors structure for image ${image_id}`);
      }

      const requiredVectors = ['primary_search', 'semantic_desc', 'object_focus'];
      for (const vectorName of requiredVectors) {
        if (!multiVectors[vectorName] || !Array.isArray(multiVectors[vectorName])) {
          throw new Error(`Missing or invalid ${vectorName} vector for image ${image_id}`);
        }
        if (multiVectors[vectorName].length !== 1536) {
          throw new Error(`Invalid ${vectorName} vector dimension for image ${image_id}: expected 1536, got ${multiVectors[vectorName].length}`);
        }
      }

      console.log(`✓ Generated valid vectors for ${image_id}: ${Object.keys(multiVectors).filter(k => k !== 'embedding_texts').join(', ')}`);

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
          primary_search: multiVectors.primary_search,
          semantic_desc: multiVectors.semantic_desc,
          object_focus: multiVectors.object_focus,
        },
        payload: {
          // Multi-vector embedding texts
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
        transformedData.push(transformed);
      } catch (error) {
        console.error(
          `Error transforming response for ${response.image_id}:`,
          error
        );
        // Continue with other items
      }
    }

    return transformedData;
  }
}

export default new DataTransformer();
