# 🖼️ Simple Image Search API

A minimal API for interior image search with two core endpoints:

1. **Get all images from CSV**
2. **Search images using vector similarity in QdrantDB**

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file:

```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key
```

### 3. Start the Server

```bash
npm start
```

### 4. Test the API

```bash
node test-api.js
```

## 📋 API Endpoints

### 1. Get All Images from CSV

```bash
GET /api/images
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "image_id": "image_cropper_1729176750910",
      "image_url": "https://solsticeprod.s3.ap-south-1.amazonaws.com/..."
    }
  ],
  "message": "Images retrieved successfully"
}
```

### 2. Search Images in QdrantDB

```bash
GET /api/images/search?query=modern living room&limit=5
```

**Parameters:**

- `query` (required): Search term
- `limit` (optional): Number of results (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "image_id": "image_cropper_123",
      "image_url": "https://...",
      "score": 0.87
    }
  ],
  "query": "modern living room",
  "message": "Found 5 matching images"
}
```

## 🔍 Usage Examples

### cURL Commands

```bash
# Get all images from CSV
curl http://localhost:3000/api/images

# Search for modern living rooms
curl "http://localhost:3000/api/images/search?query=modern living room&limit=5"

# Search for bedrooms
curl "http://localhost:3000/api/images/search?query=bedroom&limit=3"
```

### JavaScript/Fetch

```javascript
// Get all images
const response = await fetch("http://localhost:3000/api/images");
const data = await response.json();
console.log(data.data); // Array of images

// Search images
const searchResponse = await fetch(
  "http://localhost:3000/api/images/search?query=modern&limit=5"
);
const searchData = await searchResponse.json();
console.log(searchData.data); // Array of search results
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Services      │
│                 │    │                 │    │                 │
│ • Search Input  │───▶│ • Controllers   │───▶│ • ImageService  │
│ • Image List    │    │ • Routes        │    │ • QdrantService │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Error Handler │    │   Data Sources  │
                       │                 │    │                 │
                       │ • Simple errors │    │ • CSV Files     │
                       │ • 404 handling  │    │ • Qdrant DB     │
                       └─────────────────┘    └─────────────────┘
```

## 🔄 Data Flow

### Default State (List All Images)

```
Frontend → GET /api/images → ImageService.getAllImages() → CSV File → Response
```

### Search State (Vector Search)

```
Frontend → GET /api/images/search → ImageService.searchImages() →
QdrantService.search() → OpenAI Embedding → Vector Search → Response
```

## 🧪 Testing

### Run Tests

```bash
node test-api.js
```

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health

# API documentation
curl http://localhost:3000/api

# Get all images
curl http://localhost:3000/api/images

# Search images
curl "http://localhost:3000/api/images/search?query=modern&limit=3"
```

## 📝 API Documentation

For API documentation, visit:

```
http://localhost:3000/api
```

## 🚨 Error Handling

Simple error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common errors:

- **400**: Missing search query
- **404**: Route not found
- **500**: Internal server error

---

**Simple, focused, and efficient image search API**
