# Intelligent Query Processing System

This document describes the new intelligent query processing system that replaces hardcoded room type detection with a dynamic, learning-based approach.

## Overview

The intelligent query processing system uses multiple strategies to detect room types and other patterns from user queries:

1. **Data-Driven Detection**: Learns from existing room types in the database
2. **Semantic Similarity**: Uses embeddings to find similar concepts
3. **Pattern Learning**: Learns from user query history
4. **Fallback Patterns**: Uses predefined patterns as backup

## Architecture

```
User Query → Multiple Detection Strategies → Best Match → Learning → Cache
```

### Components

1. **QueryIntelligenceService** (`src/services/queryIntelligenceService.js`)
   - Multi-strategy room type detection
   - Learning from query history
   - Semantic similarity matching
   - Pattern recognition

2. **Updated ImageService** (`src/services/imageService.js`)
   - Integrates with intelligent query processing
   - Strict filtering based on detected room types
   - Enhanced logging and debugging

## Features

### 1. Multi-Strategy Detection

#### Strategy 1: Data-Driven Detection
- Scans existing room types in Qdrant database
- Direct and partial matching against real data
- Adapts to new room types as data grows

#### Strategy 2: Semantic Similarity
- Uses embeddings to find semantic matches
- Cosine similarity calculation
- Handles synonyms and variations

#### Strategy 3: Pattern Learning
- Learns from user query history
- Jaccard similarity for query matching
- Builds patterns over time

#### Strategy 4: Fallback Patterns
- Predefined patterns for common room types
- Ensures coverage for edge cases
- Configurable and extensible

### 2. Learning Capabilities

- **Query History**: Tracks all user queries
- **Pattern Recognition**: Learns word associations
- **Room Type Distribution**: Analyzes query patterns
- **Adaptive Learning**: Improves over time

### 3. Strict Filtering

- **Exact Room Type Matching**: Only returns exact matches
- **Confidence Scoring**: Multiple confidence levels
- **Debug Logging**: Detailed search process logging

## Usage Examples

### Basic Search
```bash
# Search for modern bedrooms (strict matching)
GET /api/images/search?query=modern bedroom&limit=5
```

### Query Insights
```bash
# Get query intelligence insights
GET /api/images/query-insights
```

### Testing
```bash
# Test intelligent search functionality
npm run test-intelligence
```

## API Endpoints

### Search with Intelligence
```bash
GET /api/images/search?query=<text>&limit=<number>
```

### Query Insights
```bash
GET /api/images/query-insights
```

## Configuration

### Learning Settings
```javascript
// Enable/disable learning
queryIntelligenceService.setLearningEnabled(true);

// Reset learning data
queryIntelligenceService.resetLearning();
```

### Confidence Thresholds
- **Data Match**: 0.9 (highest priority)
- **Semantic Match**: 0.8
- **Pattern Match**: 0.7
- **Historical Match**: 0.6

## Benefits

### 1. Dynamic Adaptation
- **No Hardcoding**: Adapts to new room types automatically
- **Data-Driven**: Learns from actual database content
- **User-Driven**: Learns from user query patterns

### 2. Improved Accuracy
- **Multiple Strategies**: Reduces false positives
- **Semantic Understanding**: Handles synonyms and variations
- **Strict Filtering**: Only returns relevant results

### 3. Scalability
- **Horizontal Scaling**: Can handle large query volumes
- **Memory Efficient**: Limits query history to 1000 entries
- **Performance Optimized**: Caches embeddings and patterns

### 4. Debugging & Monitoring
- **Detailed Logging**: Full search process visibility
- **Query Insights**: Analytics on user behavior
- **Learning Metrics**: Pattern recognition statistics

## Testing

### Run Intelligence Tests
```bash
npm run test-intelligence
```

### Test Specific Queries
```javascript
import queryIntelligenceService from "./src/services/queryIntelligenceService.js";

// Test room type detection
const roomType = await queryIntelligenceService.detectRoomType("modern bedroom");
console.log(`Detected: ${roomType}`);

// Get insights
const insights = await queryIntelligenceService.getQueryInsights();
console.log(insights);
```

## Performance Impact

### Before Intelligent Processing
- Hardcoded room type detection
- Limited to predefined patterns
- No learning capabilities
- Less accurate results

### After Intelligent Processing
- Dynamic room type detection
- Multiple detection strategies
- Learning from user behavior
- Higher accuracy and relevance

## Monitoring

### Query Insights Response
```json
{
  "success": true,
  "data": {
    "totalQueries": 150,
    "roomTypeStats": {
      "bedroom": 45,
      "kitchen": 30,
      "living room": 25
    },
    "mostFrequentQueries": [
      ["modern bedroom", 15],
      ["kitchen design", 12]
    ],
    "learnedPatterns": {
      "bedroom": ["modern", "master", "guest", "storage"],
      "kitchen": ["modular", "design", "cooking"]
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **No Results Found**
   - Check if room type exists in database
   - Verify query contains room type keywords
   - Review confidence thresholds

2. **Incorrect Room Type Detection**
   - Check query history for patterns
   - Review semantic similarity scores
   - Verify database room type labels

3. **Performance Issues**
   - Monitor query history size
   - Check embedding generation time
   - Review database connection

### Debug Commands

```bash
# Check existing room types
curl "http://localhost:3000/api/images/query-insights"

# Test specific query
curl "http://localhost:3000/api/images/search?query=modern bedroom"

# Reset learning data
# (Use the resetLearning() method in code)
```

## Future Enhancements

1. **Advanced NLP**: Integration with more sophisticated NLP models
2. **Context Awareness**: Consider user session and preferences
3. **Multi-Language Support**: Handle queries in different languages
4. **Real-time Learning**: Update patterns in real-time
5. **A/B Testing**: Compare different detection strategies

## Migration from Hardcoded System

The new system is backward compatible. The migration process:

1. **Automatic Detection**: Uses intelligent detection by default
2. **Fallback Support**: Falls back to patterns if needed
3. **Learning Mode**: Automatically learns from user queries
4. **Gradual Improvement**: Accuracy improves over time

## Security Considerations

1. **Query Privacy**: Query history is stored locally
2. **Data Validation**: All inputs are validated
3. **Rate Limiting**: Prevents abuse of learning system
4. **Access Control**: Insights endpoint requires authentication

The intelligent query processing system provides a robust, scalable, and adaptive solution for room type detection that improves over time and adapts to real-world usage patterns. 