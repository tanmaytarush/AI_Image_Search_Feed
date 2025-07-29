import fs from "fs";
import csv from "csv-parser";
import path from "path";

class ImageAdder {
  constructor() {
    this.existingUrls = new Set();
    this.availableUrls = [];
    this.newImages = [];
  }

  async readExistingUrls(csvFilePath) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
          if (row.image_url) {
            this.existingUrls.add(row.image_url);
          }
        })
        .on("end", () => {
          console.log(
            `📖 Read ${this.existingUrls.size} existing URLs from ${csvFilePath}`
          );
          resolve();
        })
        .on("error", reject);
    });
  }

  async readAvailableUrls(csvFilePath) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
          if (row.image_url && !this.existingUrls.has(row.image_url)) {
            this.availableUrls.push(row.image_url);
          }
        })
        .on("end", () => {
          console.log(
            `📖 Found ${this.availableUrls.length} available URLs from ${csvFilePath}`
          );
          resolve();
        })
        .on("error", reject);
    });
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  selectRandomImages(count) {
    if (this.availableUrls.length < count) {
      console.log(
        `⚠️  Warning: Only ${this.availableUrls.length} unique URLs available, but ${count} requested`
      );
      count = this.availableUrls.length;
    }

    const shuffled = this.shuffleArray(this.availableUrls);
    const selected = shuffled.slice(0, count);

    // Generate new image IDs starting from img_101
    this.newImages = selected.map((url, index) => ({
      image_id: `img_${(101 + index).toString().padStart(3, "0")}`,
      image_url: url,
    }));

    console.log(`🎯 Selected ${this.newImages.length} random images`);
    return this.newImages;
  }

  async appendToCSV(csvFilePath, images) {
    const csvContent = images
      .map((img) => `${img.image_id},"${img.image_url}"`)
      .join("\n");

    // Append to existing file
    fs.appendFileSync(csvFilePath, "\n" + csvContent);
    console.log(`💾 Appended ${images.length} images to ${csvFilePath}`);
  }

  async process() {
    try {
      console.log("🚀 Starting to add random images...");

      const interiorCsvPath = "./src/data/interior-image-urls.csv";
      const imageDataCsvPath = "./src/data/image-data.csv";

      // Check if files exist
      if (!fs.existsSync(interiorCsvPath)) {
        throw new Error(`Interior CSV file not found: ${interiorCsvPath}`);
      }
      if (!fs.existsSync(imageDataCsvPath)) {
        throw new Error(`Image data CSV file not found: ${imageDataCsvPath}`);
      }

      // Read existing URLs to avoid duplicates
      await this.readExistingUrls(interiorCsvPath);

      // Read all available URLs from image-data.csv
      await this.readAvailableUrls(imageDataCsvPath);

      // Select 400 random images
      const selectedImages = this.selectRandomImages(400);

      if (selectedImages.length === 0) {
        console.log(
          "❌ No new images to add - all URLs are already in the interior CSV"
        );
        return;
      }

      // Append to interior-image-urls.csv
      await this.appendToCSV(interiorCsvPath, selectedImages);

      console.log("\n" + "=".repeat(50));
      console.log("✅ SUCCESS SUMMARY");
      console.log("=".repeat(50));
      console.log(
        `📊 Total images in interior CSV: ${
          this.existingUrls.size + selectedImages.length
        }`
      );
      console.log(`🆕 New images added: ${selectedImages.length}`);
      console.log(
        `📝 Image IDs range: ${selectedImages[0].image_id} to ${
          selectedImages[selectedImages.length - 1].image_id
        }`
      );
    } catch (error) {
      console.error("❌ Error:", error.message);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const adder = new ImageAdder();

  try {
    await adder.process();
    console.log("\n🎉 Process completed successfully!");
  } catch (error) {
    console.error("❌ Process failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ImageAdder;
