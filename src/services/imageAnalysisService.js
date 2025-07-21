import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";
import cdnService from "./cdnService.js";

dotenv.config();

class ImageAnalysisService {
  constructor() {
    this.client = new HfInference(process.env.HF_TOKEN);
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

      const prompt = `Analyze this interior image with strong focus on Indian interior design context and provide detailed analysis in JSON format:

{
  "image_id": "${imageId}",
  "ai_generated_tags": {
    "room": "Room Type (Living Room, Bedroom, Kitchen, Dining Room, Bathroom, Study Room, Home Office, Balcony, Terrace, Pooja Room, Mandir, Drawing Room, Family Room, etc.)",
    "theme": "Design Theme (Traditional Indian, Indo-Western, Modern Indian, Contemporary Indian, South Indian, North Indian, Coastal Indian, Rajasthani, Gujarati, Bengali, Marathi, Punjabi, Kerala, Tamil Nadu, Karnataka, Maharashtra, etc.)",
    "primary_features": ["Most prominent feature 1", "Most prominent feature 2", "Most prominent feature 3"],
    "objects": [
      {
        "type": "Object Type (Sofa, Bed, Island Counter, Dining Table, TV Unit, Storage Unit, Mandir Unit, Jharokha, Diwan, Charpai, Swing, Pooja Thali, Toran, Wall Art, Brass Items, Wooden Furniture, etc.)",
        "features": ["Feature 1", "Feature 2", "Feature 3"],
        "materials": ["Material 1", "Material 2"],
        "finish": "Finish type (laminated, veneer, solid wood, glass, metal, fabric, leather, brass, copper, etc.)"
      }
    ],
    "visual_attributes": {
      "colors": ["Primary color 1", "Secondary color 2", "Accent color 3"],
      "materials": ["Primary material 1", "Secondary material 2"],
      "lighting": "Lighting type (natural daylight, warm lighting, cool lighting, LED strips, pendant lights, wall sconces, table lamps, floor lamps, diyas, etc.)",
      "texture": "Texture description (smooth, textured, rustic, polished, matte, glossy, etc.)"
    },
    "indian_context": {
      "regional_style": "Regional influence (South Indian, North Indian, East Indian, West Indian, Coastal, Himalayan, Desert, etc.)",
      "traditional_elements": ["Traditional elements present - Toran, Rangoli, Brass items, Wooden carvings, etc."],
      "modern_adaptations": ["Modern adaptations of traditional elements"],
      "space_utilization": "Space utilization style (compact, spacious, modular, open-plan, etc.)",
      "cultural_significance": "Cultural significance of design elements"
    }
  },
  "confidence_scores": {
    "room": 0.95,
    "theme": 0.87,
    "primary_features": 0.89,
    "objects": 0.92,
    "indian_context": 0.90
  },
  "description": "Detailed description focusing on Indian interior design elements, cultural significance, and space utilization patterns",
  "metadata": {
    "tags": ["tag1", "tag2", "tag3", "tag4"],
    "budget_indicator": "Budget category (economy, mid-range, premium, luxury)",
    "space_type": "Space type (1BHK, 2BHK, 3BHK, apartment, villa, studio, duplex, penthouse, etc.)",
    "functionality": "Primary function (entertainment, relaxation, work, dining, pooja, etc.)",
    "indian_specific": "Indian-specific features (modular kitchen, storage solutions, pooja room, etc.)"
  }
}

Focus on identifying:
1. Indian design elements and regional cultural influences
2. Traditional Indian furniture and decorative items
3. Space optimization techniques common in Indian homes
4. Material preferences (teak, rosewood, brass, copper, marble, granite)
5. Color schemes popular in Indian interiors
6. Storage solutions and modular furniture preferences
7. Cultural and religious elements (mandir, pooja items, etc.)
8. Regional variations in design and furniture styles

Please ensure the response is valid JSON format.`;

      const chatCompletion = await this.client.chatCompletion({
        provider: "hyperbolic",
        model: "Qwen/Qwen2.5-VL-7B-Instruct",
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
      });

      console.log(chatCompletion.choices[0].message);

      // Try to parse the response as JSON
      try {
        let content = chatCompletion.choices[0].message.content;

        // Remove markdown code blocks if present
        if (content.includes("```json")) {
          content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        }

        const jsonResponse = JSON.parse(content);
        
        // Cache the analysis result
        await cdnService.cacheAnalysis(imageUrl, jsonResponse);
        
        return jsonResponse;
      } catch (parseError) {
        // If JSON parsing fails, return the raw response
        return {
          image_id: imageId,
          raw_response: chatCompletion.choices[0].message.content,
          error: "Failed to parse JSON response",
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
