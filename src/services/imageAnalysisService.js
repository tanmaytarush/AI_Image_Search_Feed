import dotenv from "dotenv";
import cdnService from "./cdnService.js";

dotenv.config();

class ImageAnalysisService {
  constructor() {
    // Removed deprecated HfInference client
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

//       const prompt = `Analyze this interior image with strong focus on Indian interior design context and provide detailed analysis in JSON format:

// {
//   "image_id": "${imageId}",
//   "ai_generated_tags": {
//     "room": "Room Type (Living Room, Bedroom, Kitchen, Dining Room, Bathroom, Study Room, Home Office, Balcony, Terrace, Pooja Room, Mandir, Drawing Room, Family Room, etc.)",
//     "theme": "Design Theme (Traditional Indian, Indo-Western, Modern Indian, Contemporary Indian, South Indian, North Indian, Coastal Indian, Rajasthani, Gujarati, Bengali, Marathi, Punjabi, Kerala, Tamil Nadu, Karnataka, Maharashtra, etc.)",
//     "primary_features": ["Most prominent feature 1", "Most prominent feature 2", "Most prominent feature 3"],
//     "objects": [
//       {
//         "type": "Object Type (Sofa, Bed, Island Counter, Dining Table, TV Unit, Storage Unit, Mandir Unit, Jharokha, Diwan, Charpai, Swing, Pooja Thali, Toran, Wall Art, Brass Items, Wooden Furniture, etc.)",
//         "features": ["Feature 1", "Feature 2", "Feature 3"],
//         "materials": ["Material 1", "Material 2"],
//         "finish": "Finish type (laminated, veneer, solid wood, glass, metal, fabric, leather, brass, copper, etc.)"
//       }
//     ],
//     "visual_attributes": {
//       "colors": ["Primary color 1", "Secondary color 2", "Accent color 3"],
//       "materials": ["Primary material 1", "Secondary material 2"],
//       "lighting": "Lighting type (natural daylight, warm lighting, cool lighting, LED strips, pendant lights, wall sconces, table lamps, floor lamps, diyas, etc.)",
//       "texture": "Texture description (smooth, textured, rustic, polished, matte, glossy, etc.)"
//     },
//     "indian_context": {
//       "regional_style": "Regional influence (South Indian, North Indian, East Indian, West Indian, Coastal, Himalayan, Desert, etc.)",
//       "traditional_elements": ["Traditional elements present - Toran, Rangoli, Brass items, Wooden carvings, etc."],
//       "modern_adaptations": ["Modern adaptations of traditional elements"],
//       "space_utilization": "Space utilization style (compact, spacious, modular, open-plan, etc.)",
//       "cultural_significance": "Cultural significance of design elements"
//     }
//   },
//   "confidence_scores": {
//     "room": 0.95,
//     "theme": 0.87,
//     "primary_features": 0.89,
//     "objects": 0.92,
//     "indian_context": 0.90
//   },
//   "description": "Detailed description focusing on Indian interior design elements, cultural significance, and space utilization patterns",
//   "metadata": {
//     "tags": ["tag1", "tag2", "tag3", "tag4"],
//     "budget_indicator": "Budget category (economy, mid-range, premium, luxury)",
//     "space_type": "Space type (1BHK, 2BHK, 3BHK, apartment, villa, studio, duplex, penthouse, etc.)",
//     "functionality": "Primary function (entertainment, relaxation, work, dining, pooja, etc.)",
//     "indian_specific": "Indian-specific features (modular kitchen, storage solutions, pooja room, etc.)"
//   }
// }

// Focus on identifying:
// 1. Indian design elements and regional cultural influences
// 2. Traditional Indian furniture and decorative items
// 3. Space optimization techniques common in Indian homes
// 4. Material preferences (teak, rosewood, brass, copper, marble, granite)
// 5. Color schemes popular in Indian interiors
// 6. Storage solutions and modular furniture preferences
// 7. Cultural and religious elements (mandir, pooja items, etc.)
// 8. Regional variations in design and furniture styles

// Please ensure the response is valid JSON format.`;

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
                stream: false
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
              errorText.includes('model_not_supported') || // Model temporarily unavailable
              errorText.includes('provider') || // Provider issues
              errorText.includes('timeout'); // Timeout errors
            
            if (attempt === maxRetries || !isRetryableError) {
              throw lastError;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`⏳ Retryable error detected. Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          lastError = error;
          if (attempt === maxRetries) {
            throw error;
          }
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Network error. Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
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
        if (content.includes("Room Type (") || content.includes("Design Theme (") || content.includes("Traditional Indian")) {
          throw new Error("Template response detected - model returned placeholder text instead of actual analysis");
        }

        const jsonResponse = JSON.parse(content);
        
        // Validate the response structure
        if (!jsonResponse.ai_generated_tags || !jsonResponse.ai_generated_tags.room) {
          throw new Error("Invalid response structure - missing required fields");
        }
        
        // Cache the analysis result
        await cdnService.cacheAnalysis(imageUrl, jsonResponse);
        
        return jsonResponse;
      } catch (parseError) {
        console.error(`❌ JSON parsing error for ${imageId}:`, parseError.message);
        console.error(`Raw response:`, chatCompletion.choices[0].message.content);
        
        // If JSON parsing fails, return the raw response with more details
        return {
          image_id: imageId,
          raw_response: chatCompletion.choices[0].message.content,
          error: `Failed to parse JSON response: ${parseError.message}`,
          http_status: response.status,
          model_used: "Qwen/Qwen2.5-VL-7B-Instruct"
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
}

export default new ImageAnalysisService();
