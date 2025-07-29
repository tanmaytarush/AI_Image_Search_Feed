import fs from "fs";
import csv from "csv-parser";

// Function to read CSV and extract first 100 images
async function createImageDataset() {
  const images = [];
  let count = 0;
  
  return new Promise((resolve, reject) => {
    fs.createReadStream("../src/data/image-data.csv")
      .pipe(csv())
      .on("data", (row) => {
        if (count < 100 && row.image_url) {
          // Assign sequential image IDs starting from 1
          images.push({
            image_id: `img_${String(count + 1).padStart(3, '0')}`,
            image_url: row.image_url
          });
          count++;
        }
      })
      .on("end", () => {
        console.log(`Extracted ${images.length} images from CSV`);
        resolve(images);
      })
      .on("error", reject);
  });
}

// Function to write new CSV file
function writeNewCSV(images) {
  // Create CSV header
  const csvHeader = "image_id,image_url\n";
  
  // Create CSV rows
  const csvRows = images.map(img => `${img.image_id},"${img.image_url}"`).join('\n');
  
  // Combine header and rows
  const csvContent = csvHeader + csvRows;
  
  // Write to file
  fs.writeFileSync("../src/data/interior-image-urls.csv", csvContent);
  console.log("✅ New CSV file created successfully!");
  console.log(`📁 File saved to: ../src/data/interior-image-urls.csv`);
  console.log(`📊 Total images: ${images.length}`);
}

// Main execution
async function main() {
  try {
    console.log("🔄 Processing image dataset...");
    const images = await createImageDataset();
    writeNewCSV(images);
    
    console.log("\n📋 First 5 entries preview:");
    images.slice(0, 5).forEach((img, index) => {
      console.log(`${index + 1}. ${img.image_id} -> ${img.image_url.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createImageDataset, writeNewCSV };