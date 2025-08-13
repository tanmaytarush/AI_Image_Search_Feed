import fs from "fs";
import csv from "csv-parser";
import path from "path";
import dotenv from "dotenv";
import imageAnalysisService from "../src/services/imageAnalysisService.js";
import dataTransformer from "../src/utils/dataTransformer.js";
import qdrantService from "../src/services/qdrantService.js";
import cdnService from "../src/services/cdnService.js";

dotenv.config();

class ImageProcessor {
  constructor(startIndex = 1001) {
    this.startIndex = startIndex;
    this.batchSize = 3; // Process 3 images at a time
    this.delayBetweenBatches = 5000; // 5 seconds delay between batches
    this.results = [];
    this.errors = [];
    this.processedCount = 0;
  }

  async readCSV(csvFilePath) {
    return new Promise((resolve, reject) => {
      const images = [];

      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
          // CSV has both image_id and image_url columns
          if (row.image_id && row.image_url) {
            // Extract the numeric part of the image_id
            const match = row.image_id.match(/img_(\d+)/);
            if (match) {
              const imageNumber = parseInt(match[1]);
              // Only include images from startIndex onwards
              if (imageNumber >= this.startIndex) {
                images.push({
                  image_id: row.image_id,
                  image_url: row.image_url,
                  image_number: imageNumber
                });
              }
            }
          }
        })
        .on("end", () => {
          console.log(`📊 Read ${images.length} images from CSV starting from index ${this.startIndex}`);
          // Sort by image number to ensure proper order
          images.sort((a, b) => a.image_number - b.image_number);
          resolve(images);
        })
        .on("error", reject);
    });
  }

  async processBatch(images) {
    console.log(`🔄 Processing batch of ${images.length} images...`);

    const batchResults = [];

    // Process images sequentially with delays to avoid rate limiting
    for (const image of images) {
      try {
        console.log(`🔍 Analyzing image: ${image.image_id} (${image.image_url.substring(0, 80)}...)`);

        // Analyze image with AI model
        const analysisResult = await imageAnalysisService.analyzeImage(
          image.image_url,
          image.image_id
        );

        // Validate analysis result
        if (!analysisResult || !analysisResult.image_id) {
          console.warn(`⚠️ Invalid analysis result for ${image.image_id}:`, analysisResult);
          continue;
        }

        // Add image URL to result
        analysisResult.image_url = image.image_url;

        console.log(`✅ Completed analysis for: ${image.image_id}`);
        batchResults.push(analysisResult);
        this.processedCount++;

        // Add delay between individual images to avoid rate limiting
        if (images.indexOf(image) < images.length - 1) {
          console.log(`⏳ Waiting 1 second before next image...`);
          await this.delay(1000);
        }
      } catch (error) {
        console.error(`❌ Error processing ${image.image_id}:`, error.message);
        this.errors.push({
          image_id: image.image_id,
          error: error.message,
        });
      }
    }

    return batchResults;
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async processAllImages(csvFilePath) {
    try {
      console.log(`🚀 Starting image processing pipeline from index ${this.startIndex}...`);

      // Read images from CSV
      const images = await this.readCSV(csvFilePath);

      if (images.length === 0) {
        console.log(`No images found in CSV file from index ${this.startIndex}`);
        return;
      }

      // Initialize Qdrant collection
      console.log("📊 Setting up Qdrant collection...");
      await qdrantService.createCollection();

      // Process images in batches
      for (let i = 0; i < images.length; i += this.batchSize) {
        const batch = images.slice(i, i + this.batchSize);
        console.log(`\n📦 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(images.length / this.batchSize)}`);
        
        const batchResults = await this.processBatch(batch);
        
        if (batchResults.length > 0) {
          try {
            // Transform data for Qdrant (handle async transformation properly)
            const transformedData = [];
            console.log(`🔄 Transforming ${batchResults.length} batch results...`);
            
            for (const result of batchResults) {
              try {
                console.log(`🔄 Transforming result for ${result.image_id}...`);
                const transformed = await dataTransformer.transformToQdrantFormat(result);
                
                if (transformed && transformed.id) {
                  console.log(`✅ Successfully transformed ${result.image_id} with ID: ${transformed.id}`);
                  transformedData.push(transformed);
                } else {
                  console.warn(`⚠️ Skipping invalid transformation for ${result.image_id} - missing ID or transformation failed`);
                }
              } catch (error) {
                console.warn(`⚠️ Failed to transform ${result.image_id}: ${error.message}`);
              }
            }
            
            console.log(`📊 Transformation complete: ${transformedData.length}/${batchResults.length} successful`);

            if (transformedData.length === 0) {
              console.warn(`⚠️ No valid transformations in batch, skipping Qdrant upsert`);
              continue;
            }

            // Validate transformed data before upserting
            const validData = transformedData.filter(item => {
              if (!item.id) {
                console.warn(`⚠️ Skipping item without ID:`, item);
                return false;
              }
              if (!item.vectors || !item.payload) {
                console.warn(`⚠️ Skipping item with missing vectors or payload:`, item);
                return false;
              }
              return true;
            });

            if (validData.length === 0) {
              console.warn(`⚠️ No valid data to upsert in batch`);
              continue;
            }

            // Upsert to Qdrant
            console.log(`💾 Upserting ${validData.length} images to Qdrant...`);
            await qdrantService.upsertPoints(validData);
            console.log(`✅ Successfully upserted batch to Qdrant`);

            // Save results to local file
            this.results.push(...batchResults);
          } catch (error) {
            console.error(`❌ Error upserting batch to Qdrant:`, error.message);
          }
        }

        // Add delay between batches
        if (i + this.batchSize < images.length) {
          console.log(`⏳ Waiting ${this.delayBetweenBatches / 1000} seconds before next batch...`);
          await this.delay(this.delayBetweenBatches);
        }
      }

      console.log(`\n🎉 Processing completed!`);
      this.printSummary();

    } catch (error) {
      console.error("❌ Error in processing pipeline:", error);
    }
  }

  printSummary() {
    console.log("\n📊 Processing Summary:");
    console.log(`📍 Started from index: ${this.startIndex}`);
    console.log(`✅ Successfully processed: ${this.processedCount} images`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log("\n❌ Errors:");
      this.errors.forEach(error => {
        console.log(`  - ${error.image_id}: ${error.error}`);
      });
    }

    if (this.results.length > 0) {
      console.log(`\n💾 Results saved: ${this.results.length} images`);
    }
  }

  async saveResults(outputPath) {
    if (this.results.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `processing_results_from_index_${this.startIndex}_${timestamp}.json`;
      const fullPath = path.join(outputPath, filename);
      
      fs.writeFileSync(fullPath, JSON.stringify(this.results, null, 2));
      console.log(`💾 Results saved to: ${fullPath}`);
    }
  }
}

async function main() {
  const startIndex = process.argv[2] ? parseInt(process.argv[2]) : 1001;
  
  if (isNaN(startIndex) || startIndex < 1) {
    console.error("❌ Please provide a valid start index (e.g., node processImagesFromIndex.js 1001)");
    process.exit(1);
  }

  const csvFilePath = path.join(process.cwd(), "src", "data", "interior-image-urls.csv");
  const outputPath = path.join(process.cwd(), "output");

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const processor = new ImageProcessor(startIndex);
  await processor.processAllImages(csvFilePath);
  await processor.saveResults(outputPath);
}

// Run the script
main().catch(console.error);
