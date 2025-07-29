# Interior Image Embedding System

A comprehensive system for analyzing interior design images using AI and storing them in a vector database for semantic search.

## Features

- 🖼️ **AI Image Analysis**: Uses Hugging Face's Qwen2.5-VL model for detailed interior analysis
- 🎯 **Indian Context Focus**: Optimized for Indian interior design with regional styles
- 🔍 **Vector Search**: Stores embeddings in Qdrant for semantic similarity search
- 📊 **Batch Processing**: Processes multiple images efficiently with rate limiting
- 🏗️ **Modular Architecture**: Clean separation of concerns with dedicated services
- 🚀 **CDN Layer**: Caches processed images and analysis results to reduce model inference load

## Architecture

```
CSV Images → CDN Layer → AI Analysis → Data Transformation → Qdrant Vector DB
```

The CDN layer provides:
- **Image Optimization**: Transforms original images for faster processing
- **Analysis Caching**: Stores results to avoid re-processing
- **Cache Management**: Tools to monitor and manage cache performance

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Hugging Face API
HF_TOKEN=your_huggingface_token

# OpenAI API (for embeddings)
OPENAI_API_KEY=your_openai_api_key

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key

# CDN Configuration (optional)
CDN_BASE_URL=https://cdn.example.com
```

### 3. Qdrant Setup

Install and run Qdrant:

```bash
# Using Docker
docker run -p 6333:6333 qdrant/qdrant

# Or download from https://qdrant.tech/documentation/guides/installation/
```

## Usage

### 1. Test Single Image Analysis

```bash
npm run test
```

### 2. Process CSV File

Create a CSV file with columns: `image_id, image_url`

```csv
image_id,image_url
img_001,https://example.com/image1.jpg
img_002,https://example.com/image2.jpg
```

Run the processing script:

```bash
# Process default CSV file
npm run process

# Process specific CSV file
node scripts/processImages.js ./path/to/your/images.csv
```

### 3. Search Similar Images

```javascript
import qdrantService from "./src/services/qdrantService.js";
import embeddingService from "./src/services/embeddingService.js";

// Search for similar bedrooms
const searchText = "modern indian bedroom with wooden furniture";
const vector = await embeddingService.getEmbedding(searchText);

const results = await qdrantService.searchSimilar(vector, 10, {
  room_type: "bedroom",
  design_theme: "modern indian",
});
```

## Data Structure

### AI Model Output

```json
{
  "image_id": "test_001",
  "ai_generated_tags": {
    "room": "Bedroom",
    "theme": "Modern Indian",
    "primary_features": ["Bed with Storage", "Built-in Wardrobe"],
    "objects": [...],
    "visual_attributes": {...},
    "indian_context": {...}
  },
  "confidence_scores": {...},
  "description": "...",
  "metadata": {...}
}
```

### Qdrant Structure

```json
{
  "id": "test_001",
  "vector": [0.1, 0.2, ...],
  "payload": {
    "embedding_text": "bedroom modern indian...",
    "room_type": "bedroom",
    "design_theme": "modern indian",
    "colors": ["white", "brown"],
    "materials": ["wood", "laminated finish"],
    "confidence_scores": {...},
    "original_analysis": {...}
  }
}
```

## Configuration

### Batch Processing

- **Batch Size**: 5 images per batch (configurable in `ImageProcessor`)
- **Delay**: 2 seconds between batches (to avoid rate limiting)

### Qdrant Collection

- **Vector Size**: 1536 dimensions (OpenAI embeddings)
- **Distance Metric**: Cosine similarity
- **Indexed Fields**: room_type, design_theme, budget_category, space_type

## API Endpoints

### Image Search
- `GET /api/images` - Get all images from CSV
- `GET /api/images/search?query=<text>&limit=<number>` - Search images using vector similarity

### CDN Management
- `GET /api/cdn/stats` - Get cache statistics
- `DELETE /api/cdn/expired` - Clear expired cache entries
- `DELETE /api/cdn/all` - Clear all cache
- `GET /api/cdn/check/:imageId?imageUrl=<url>` - Check CDN status for specific image

The system includes services for:

- **Image Analysis**: `src/services/imageAnalysisService.js`
- **CDN Layer**: `src/services/cdnService.js`
- **Embedding Generation**: `src/services/embeddingService.js`
- **Vector Database**: `src/services/qdrantService.js`
- **Data Transformation**: `src/utils/dataTransformer.js`

## Performance

- **Processing Speed**: ~5 images per minute (with rate limiting)
- **Search Response**: < 200ms for similarity search
- **Accuracy**: High precision for Indian interior design context
- **Cache Performance**: 24-hour TTL with automatic cleanup
- **CDN Optimization**: Reduced model inference load through caching

## Error Handling

- Graceful handling of API failures
- Detailed error logging
- Batch processing continues even if individual images fail
- Results saved to JSON file for review

## Output

Processing results are saved to:

- `./output/processing_results_[timestamp].json`
- Qdrant vector database
- Console logs with progress and summary
- CDN cache for future use

## Testing

### Test CDN Functionality

```bash
node scripts/testCDN.js
```

### Monitor Cache Performance

```bash
# Get cache statistics
curl http://localhost:3000/api/cdn/stats

# Check specific image
curl "http://localhost:3000/api/cdn/check/123?imageUrl=https://example.com/image.jpg"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
# AI_Image_Search_Feed
