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
  constructor() {
    this.batchSize = 5; // Process 5 images at a time
    this.delayBetweenBatches = 2000; // 2 seconds delay between batches
    this.results = [];
    this.errors = [];
  }

  async readCSV(csvFilePath) {
    return new Promise((resolve, reject) => {
      const images = [];

      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
          // CSV now has both image_id and image_url columns
          if (row.image_id && row.image_url) {
            images.push({
              image_id: row.image_id,
              image_url: row.image_url,
            });
          }
        })
        .on("end", () => {
          console.log(`Read ${images.length} images from CSV`);
          resolve(images);
        })
        .on("error", reject);
    });
  }

  async processBatch(images) {
    console.log(`Processing batch of ${images.length} images...`);

    const batchPromises = images.map(async (image) => {
      try {
        console.log(`Analyzing image: ${image.image_id}`);

        // Analyze image with AI model
        const analysisResult = await imageAnalysisService.analyzeImage(
          image.image_url,
          image.image_id
        );

        // Add image URL to result
        analysisResult.image_url = image.image_url;

        console.log(`✓ Completed analysis for: ${image.image_id}`);
        return analysisResult;
      } catch (error) {
        console.error(`✗ Error processing ${image.image_id}:`, error.message);
        this.errors.push({
          image_id: image.image_id,
          error: error.message,
        });
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    return batchResults.filter((result) => result !== null);
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async processAllImages(csvFilePath) {
    try {
      console.log("🚀 Starting image processing pipeline...");

      // Read images from CSV
      const images = await this.readCSV(csvFilePath);

      if (images.length === 0) {
        console.log("No images found in CSV file");
        return;
      }

      // Initialize Qdrant collection
      console.log("📊 Setting up Qdrant collection...");
      await qdrantService.createCollection();

      // Process images in batches
      for (let i = 0; i < images.length; i += this.batchSize) {
        const batch = images.slice(i, i + this.batchSize);
        console.log(
          `\n📦 Processing batch ${
            Math.floor(i / this.batchSize) + 1
          }/${Math.ceil(images.length / this.batchSize)}`
        );

        // Process batch
        const batchResults = await this.processBatch(batch);
        this.results.push(...batchResults);

        // Transform batch results to Qdrant format
        console.log("🔄 Transforming data for Qdrant...");
        const transformedData = await dataTransformer.transformBatch(
          batchResults
        );

        // Store in Qdrant
        if (transformedData.length > 0) {
          console.log("💾 Storing in Qdrant...");
          await qdrantService.upsertPoints(transformedData);
        }

        // Delay between batches to avoid rate limiting
        if (i + this.batchSize < images.length) {
          console.log(
            `⏳ Waiting ${this.delayBetweenBatches}ms before next batch...`
          );
          await this.delay(this.delayBetweenBatches);
        }
      }

      // Print summary
      this.printSummary();
    } catch (error) {
      console.error("❌ Error in processing pipeline:", error);
      throw error;
    }
  }

  printSummary() {
    console.log("\n" + "=".repeat(50));
    console.log("📊 PROCESSING SUMMARY");
    console.log("=".repeat(50));
    console.log(`✅ Successfully processed: ${this.results.length} images`);
    console.log(`❌ Errors: ${this.errors.length} images`);

    // Get CDN cache statistics
    const cdnStats = cdnService.getCacheStats();
    console.log(`📦 CDN Cache: ${cdnStats.analysis_cache_count} analysis results cached`);

    if (this.errors.length > 0) {
      console.log("\n❌ Failed images:");
      this.errors.forEach((error) => {
        console.log(`  - ${error.image_id}: ${error.error}`);
      });
    }
  }

  async saveResults(outputPath) {
    const output = {
      processed_at: new Date().toISOString(),
      total_processed: this.results.length,
      errors: this.errors,
      results: this.results,
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`💾 Results saved to: ${outputPath}`);
  }
}

// Main execution
async function main() {
  const processor = new ImageProcessor();

  // Get CSV file path from command line argument or use default
  const csvFilePath = process.argv[2] || "./src/data/interior-image-urls.csv";

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    console.log("Usage: node scripts/processImages.js <path-to-csv>");
    process.exit(1);
  }

  try {
    await processor.processAllImages(csvFilePath);

    // Save results to file
    const outputPath = `./output/processing_results_${Date.now()}.json`;
    await processor.saveResults(outputPath);

    console.log("\n🎉 Processing completed successfully!");
  } catch (error) {
    console.error("❌ Processing failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ImageProcessor;
