import dotenv from "dotenv";
import cdnService from "./cdnService.js";
import embeddingService from "./embeddingService.js";
import qdrantService from "./qdrantService.js";

dotenv.config();

class ImageAnalysisService {
  constructor() {
    // Removed deprecated HfInference client
    this.expectedEmbeddingDimension = 384; // Ensure compatibility with embedding system
  }

  async analyzeImage(imageUrl, imageId) {
    try {
      // Check CDN cache first
      const cachedAnalysis = await cdnService.getCachedAnalysis(imageUrl);
      if (cachedAnalysis) {
        console.log(`📦 Using cached analysis for image: ${imageId}`);
        return cachedAnalysis;
      }

      // Get optimized CDN URL for the image
      const cdnUrl = await cdnService.getCDNUrl(imageUrl);
      console.log(`🔄 Using CDN optimized URL: ${cdnUrl}`);

      const prompt = `You are an expert interior design analyst specializing in Indian interior design. Analyze this image and return ONLY a JSON object with your actual analysis of what you see.

      CRITICAL REQUIREMENTS:
      - Analyze the ACTUAL image content, not examples
      - Use real observations, not placeholder text
      - Focus heavily on Indian design elements and cultural context
      - Return only valid JSON format

      Expected JSON structure (replace ALL values with your actual analysis):

      {
        "image_id": "${imageId}",
        "ai_generated_tags": {
          "room": "Identify the actual room type you observe",
          "theme": "Determine the specific design style present", 
          "primary_features": ["List actual prominent features you see"],
          "objects": [
            {
              "type": "Name the specific furniture/object you identify",
              "features": ["Describe actual visual characteristics"],
              "materials": ["Identify materials you can observe"],
              "finish": "Describe the actual surface finish visible"
            }
          ],
          "visual_attributes": {
            "colors": ["List actual colors you observe in the image"],
            "materials": ["Identify actual materials visible"],
            "lighting": "Describe the lighting conditions you observe",
            "texture": "Describe actual textures visible in the image"
          },
          "indian_context": {
            "regional_style": "Identify specific regional influences if visible",
            "traditional_elements": ["List any traditional Indian elements you can see"],
            "modern_adaptations": ["Note modern interpretations of traditional elements"],
            "space_utilization": "Describe how the space is actually organized",
            "cultural_significance": "Explain cultural relevance of visible elements"
          }
        },
        "confidence_scores": {
          "room": 0.95,
          "theme": 0.87,
          "primary_features": 0.89,
          "objects": 0.92,
          "indian_context": 0.90
        },
        "description": "Provide detailed description of the actual interior space with focus on Indian design elements",
        "metadata": {
          "tags": ["Generate relevant tags based on what you see"],
          "budget_indicator": "Assess budget level based on visible materials and finishes",
          "space_type": "Identify the apparent residential space type",
          "functionality": "Describe the primary purpose of this space",
          "indian_specific": "Highlight Indian-specific design features visible"
        }
      }

      ANALYSIS FOCUS AREAS:
      - Indian regional design influences and cultural elements
      - Traditional furniture styles (diwan, jharokha, carved elements)
      - Material usage (teak, brass, marble, granite, copper)
      - Color palettes typical in Indian interiors
      - Storage and space optimization solutions
      - Religious or cultural decorative elements
      - Regional variations in design approach

      Return ONLY the JSON object with your actual analysis of this specific image.`;

      // Retry logic for API calls
      const maxRetries = 3;
      const baseDelay = 2000; // 2 seconds
      let lastError;
      let response;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${imageId}`);

          response = await fetch(
            "https://router.huggingface.co/auto/v1/chat/completions",
            {
              headers: {
                Authorization: `Bearer ${process.env.HF_TOKEN}`,
                "Content-Type": "application/json",
              },
              method: "POST",
              body: JSON.stringify({
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: prompt,
                      },
                      {
                        type: "image_url",
                        image_url: {
                          url: cdnUrl, // Use CDN optimized URL
                        },
                      },
                    ],
                  },
                ],
                model: "Qwen/Qwen2.5-VL-7B-Instruct",
                stream: false,
              }),
            }
          );

          if (response.ok) {
            console.log(`✅ Success on attempt ${attempt} for ${imageId}`);
            break;
          } else {
            const errorText = await response.text();
            lastError = new Error(`HTTP ${response.status}: ${errorText}`);

            // Check if it's a retryable error
            const isRetryableError =
              response.status === 429 || // Rate limit
              response.status === 500 || // Server error
              response.status === 502 || // Bad gateway
              response.status === 503 || // Service unavailable
              response.status === 504 || // Gateway timeout
              errorText.includes("model_not_supported") || // Model temporarily unavailable
              errorText.includes("provider") || // Provider issues
              errorText.includes("timeout"); // Timeout errors

            if (attempt === maxRetries || !isRetryableError) {
              throw lastError;
            }

            const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(
              `⏳ Retryable error detected. Waiting ${delay}ms before retry...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          lastError = error;
          if (attempt === maxRetries) {
            throw error;
          }
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Network error. Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      const chatCompletion = await response.json();

      console.log(chatCompletion.choices[0].message);

      // Try to parse the response as JSON
      try {
        let content = chatCompletion.choices[0].message.content;

        // Remove markdown code blocks if present
        if (content.includes("```json")) {
          content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        }

        // Check for template responses
        if (
          content.includes("Room Type (") ||
          content.includes("Design Theme (") ||
          content.includes("Traditional Indian")
        ) {
          throw new Error(
            "Template response detected - model returned placeholder text instead of actual analysis"
          );
        }

        const jsonResponse = JSON.parse(content);

        // Validate the response structure
        if (
          !jsonResponse.ai_generated_tags ||
          !jsonResponse.ai_generated_tags.room
        ) {
          throw new Error(
            "Invalid response structure - missing required fields"
          );
        }

        // Cache the analysis result
        await cdnService.cacheAnalysis(imageUrl, jsonResponse);

        // Validate that the analysis result is compatible with 384-dimensional embedding system
        this.validateAnalysisForEmbedding(jsonResponse);

        // Auto inference: Generate embeddings and store in Qdrant
        await this.performAutoInference(imageUrl, imageId, jsonResponse);

        // Add imageUrl to the response for visual feature extraction
        return {
          ...jsonResponse,
          imageUrl: imageUrl
        };
      } catch (parseError) {
        console.error(
          `❌ JSON parsing error for ${imageId}:`,
          parseError.message
        );
        console.error(
          `Raw response:`,
          chatCompletion.choices[0].message.content
        );

        // If JSON parsing fails, return the raw response with more details
        return {
          image_id: imageId,
          imageUrl: imageUrl,
          raw_response: chatCompletion.choices[0].message.content,
          error: `Failed to parse JSON response: ${parseError.message}`,
          http_status: response.status,
          model_used: "Qwen/Qwen2.5-VL-7B-Instruct",
        };
      }
    } catch (error) {
      console.error("Error analyzing image:", error);

      // Provide more specific error information
      let errorMessage = "Failed to analyze image";
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      if (error.status) {
        errorMessage += ` (HTTP ${error.status})`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Perform auto inference: Generate embeddings and store in Qdrant
   */
  async performAutoInference(imageUrl, imageId, analysisResult) {
    try {
      console.log(`🤖 Starting auto inference for image: ${imageId}`);

      // Generate embeddings from analysis result
      const embeddings = await this.generateEmbeddingsFromAnalysis(analysisResult);
      
      // Create point for Qdrant storage
      const point = {
        id: imageId,
        vectors: {
          primary_search: embeddings.primary_search,
          semantic_desc: embeddings.semantic_desc,
          object_focus: embeddings.object_focus
        },
        payload: {
          image_url: imageUrl,
          analysis: analysisResult,
          room_type: analysisResult.ai_generated_tags?.room || null,
          budget_category: analysisResult.metadata?.budget_indicator || null,
          space_type: analysisResult.metadata?.space_type || null,
          design_theme: analysisResult.ai_generated_tags?.theme || null,
          created_at: new Date().toISOString(),
          embedding_dimensions: this.expectedEmbeddingDimension
        }
      };

      // Store in Qdrant
      await qdrantService.upsertPoints([point]);
      
      console.log(`✅ Auto inference completed for image: ${imageId}`);
      console.log(`📊 Stored with ${this.expectedEmbeddingDimension}-dimensional embeddings`);
      
      return point;
    } catch (error) {
      console.error(`❌ Auto inference failed for image ${imageId}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate hybrid embeddings (visual + text) from analysis result
   */
  async generateEmbeddingsFromAnalysis(analysisResult, imageUrl) {
    try {
      const tags = analysisResult.ai_generated_tags;
      
      // Generate text embeddings (384d each)
      const primarySearchText = this.buildPrimarySearchText(tags);
      const semanticDescText = this.buildSemanticDescText(tags, analysisResult.description);
      const objectFocusText = this.buildObjectFocusText(tags);
      
      const [primary_search, semantic_desc, object_focus] = await Promise.all([
        embeddingService.getEmbedding(primarySearchText, "Generate primary search embeddings for interior design images"),
        embeddingService.getEmbedding(semanticDescText, "Generate semantic description embeddings for interior design analysis"),
        embeddingService.getEmbedding(objectFocusText, "Generate object focus embeddings for interior design objects and features")
      ]);

      // Extract visual features (384d)
      const visual_features = await embeddingService.extractVisualFeatures(imageUrl);

      // Validate all embeddings have correct dimensions
      this.validateEmbeddingDimensions(primary_search, "primary_search");
      this.validateEmbeddingDimensions(semantic_desc, "semantic_desc");
      this.validateEmbeddingDimensions(object_focus, "object_focus");
      this.validateVisualFeatures(visual_features, "visual_features");

      console.log(`✅ Generated hybrid embeddings:
        • Visual Features: ${visual_features.length}d (CNN)
        • Text Embeddings: 384d each (ANN)`);

      return {
        primary_search,
        semantic_desc,
        object_focus,
        visual_features
      };
    } catch (error) {
      console.error("❌ Failed to generate hybrid embeddings from analysis:", error.message);
      throw error;
    }
  }

  /**
   * Build primary search text from analysis tags
   */
  buildPrimarySearchText(tags) {
    const elements = [
      tags.room,
      tags.theme,
      ...(tags.primary_features || []),
      ...(tags.visual_attributes?.colors || []),
      ...(tags.visual_attributes?.materials || [])
    ].filter(Boolean);

    return elements.join(" ");
  }

  /**
   * Build semantic description text from analysis tags and description
   */
  buildSemanticDescText(tags, description) {
    const elements = [
      description,
      tags.room,
      tags.theme,
      ...(tags.indian_context?.traditional_elements || []),
      ...(tags.indian_context?.modern_adaptations || []),
      tags.indian_context?.regional_style,
      tags.indian_context?.cultural_significance
    ].filter(Boolean);

    return elements.join(" ");
  }

  /**
   * Build object focus text from analysis tags
   */
  buildObjectFocusText(tags) {
    const elements = [
      ...(tags.objects?.map(obj => `${obj.type} ${obj.materials?.join(" ")} ${obj.finish}`) || []),
      ...(tags.primary_features || []),
      ...(tags.visual_attributes?.materials || []),
      tags.visual_attributes?.lighting,
      tags.visual_attributes?.texture
    ].filter(Boolean);

    return elements.join(" ");
  }

  /**
   * Validate embedding dimensions
   */
  validateEmbeddingDimensions(embedding, context) {
    if (!Array.isArray(embedding) || embedding.length !== this.expectedEmbeddingDimension) {
      throw new Error(
        `Invalid ${context} embedding dimensions: expected ${this.expectedEmbeddingDimension}, got ${embedding?.length || 'undefined'}`
      );
    }
  }

  /**
   * Validate visual features dimensions (384d)
   */
  validateVisualFeatures(visualFeatures, context) {
    if (!Array.isArray(visualFeatures) || visualFeatures.length !== 384) {
      throw new Error(
        `Invalid ${context} visual features dimensions: expected 384, got ${visualFeatures?.length || 'undefined'}`
      );
    }
  }

  /**
   * Validate that analysis result is compatible with 384-dimensional embedding system
   */
  validateAnalysisForEmbedding(analysisResult) {
    try {
      // Check that the analysis has the required structure for embedding generation
      if (!analysisResult.ai_generated_tags) {
        throw new Error("Analysis missing ai_generated_tags structure");
      }

      const tags = analysisResult.ai_generated_tags;
      
      // Validate required fields for embedding generation
      const requiredFields = ['room', 'theme'];
      for (const field of requiredFields) {
        if (!tags[field]) {
          console.warn(`⚠️ Analysis missing ${field} field - may affect embedding quality`);
        }
      }

      // Check for fields that will be used in embedding generation
      const embeddingFields = [
        tags.room,
        tags.theme,
        ...(tags.primary_features || []),
        ...(tags.visual_attributes?.colors || []),
        ...(tags.visual_attributes?.materials || []),
        ...(tags.objects?.map(obj => obj.type) || []),
        ...(tags.indian_context?.traditional_elements || []),
        ...(tags.indian_context?.modern_adaptations || [])
      ].filter(Boolean);

      if (embeddingFields.length === 0) {
        console.warn("⚠️ Analysis has no content for embedding generation");
      } else {
        console.log(`✅ Analysis validated for 384-dimensional embedding system (${embeddingFields.length} content fields)`);
      }

      return true;
    } catch (error) {
      console.error("❌ Analysis validation failed:", error.message);
      // Don't throw - just log the warning
      return false;
    }
  }
}

export default new ImageAnalysisService();
