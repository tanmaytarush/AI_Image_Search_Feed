# AI-Powered Search with GPT-3.5-turbo

This document explains the AI search functionality that uses GPT-3.5-turbo to enhance search capabilities for Indian interior design queries.

## Overview

The AI search layer provides intelligent query understanding and enhanced search results by:

1. **AI-powered room type detection** - Maps user queries to database room types
2. **Secondary keyword extraction** - Identifies relevant design elements and features
3. **Cultural context understanding** - Recognizes Indian design terminology
4. **Enhanced result ranking** - Uses AI to improve search result relevance

## Key Features

### 1. Intelligent Room Type Detection

The AI can map various user inputs to database room types:

| User Query | AI Detection | Confidence |
|------------|--------------|------------|
| "mandir" | "prayer room" | 0.95 |
| "pooja room" | "prayer room" | 0.98 |
| "study" | "home office" | 0.92 |
| "drawing room" | "living room" | 0.89 |
| "kitchen" | "kitchen" | 0.99 |

### 2. Cultural Context Recognition

The AI understands Indian interior design terminology:

- **Religious spaces**: mandir, pooja room, temple
- **Traditional elements**: jharokha, diwan, charpai
- **Regional variations**: drawing room, family room
- **Cultural materials**: brass, copper, teak, marble

### 3. Secondary Keyword Extraction

Extracts relevant keywords for enhanced search:

```
Query: "modern mandir with brass diyas and wooden carvings"
Keywords: ["modern", "mandir", "brass", "diyas", "wooden", "carvings", "traditional", "religious"]
```

## API Integration

### Main Search Method

```javascript
// Use AI-powered search
const result = await queryIntelligenceService.intelligentSearch(query, limit, filters);

// Or use enhanced search with fallback
const result = await queryIntelligenceService.enhancedSearch(query, limit, filters, useAI = true);
```

### Response Structure

```javascript
{
  results: [...], // Enhanced search results
  ai_insights: {
    detected_room: {
      detectedRoom: "prayer room",
      confidence: 0.95,
      reasoning: "User mentioned 'mandir' which is a Hindu temple/prayer room",
      alternativeMatches: ["pooja room", "temple"],
      culturalContext: "Hindu religious space"
    },
    extracted_keywords: ["modern", "brass", "diyas", "wooden"],
    search_strategy: {
      primary_room: "prayer room",
      secondary_keywords: ["modern", "brass", "diyas"],
      cultural_context: "Hindu religious space",
      confidence_threshold: 0.95
    },
    confidence_score: 0.95
  },
  original_query: "modern mandir with brass diyas",
  enhanced_query: "modern prayer room with brass diyas and traditional elements"
}
```

## Implementation Details

### 1. AI Room Detection (`aiDetectRoomType`)

Uses GPT-3.5-turbo to intelligently map user queries to database room types:

```javascript
const prompt = `You are an expert interior design assistant specializing in Indian interior design. 

Given a user query: "${query}"

Available room types in our database: ${existingRoomTypes}

Task: Analyze the query and identify the most relevant room type(s) from the database.

Consider:
1. Direct matches (e.g., "mandir" → "prayer room", "pooja room")
2. Cultural context (e.g., "mandir" → "prayer room", "temple" → "prayer room")
3. Functional similarities (e.g., "study" → "home office", "work area" → "home office")
4. Regional variations (e.g., "drawing room" → "living room", "family room" → "living room")

Return ONLY a JSON object with this structure:
{
  "detectedRoom": "exact_room_type_from_database",
  "confidence": 0.95,
  "reasoning": "brief explanation of why this room type was chosen",
  "alternativeMatches": ["other_possible_room_types"],
  "culturalContext": "any_cultural_or_regional_context_detected"
}`;
```

### 2. Keyword Extraction (`aiExtractKeywords`)

Extracts relevant design keywords from user queries:

```javascript
const prompt = `You are an expert interior design assistant. Extract relevant keywords from this query: "${query}"

Focus on:
1. Design elements (furniture, materials, colors, styles)
2. Functional requirements (storage, seating, lighting)
3. Cultural elements (traditional, modern, regional)
4. Budget indicators (premium, affordable, luxury)
5. Space characteristics (small, spacious, compact)

Return ONLY a JSON array of keywords:
["keyword1", "keyword2", "keyword3"]`;
```

### 3. Result Enhancement (`aiEnhanceResults`)

Uses AI to improve search result ranking and relevance:

```javascript
const prompt = `You are an expert interior design assistant. 

Original Query: "${originalQuery}"
AI Detected Room: ${aiRoomDetection?.detectedRoom || 'none'}
AI Extracted Keywords: ${aiKeywords.join(', ')}

I have ${searchResults.results.length} search results. For each result, analyze how well it matches the user's intent and provide a relevance score (0-1).

Consider:
1. Room type match (if AI detected a specific room)
2. Keyword relevance (materials, styles, colors mentioned)
3. Cultural context alignment
4. Functional requirements match

Return ONLY a JSON object with enhanced results:
{
  "enhanced_results": [
    {
      "id": "result_id",
      "relevance_score": 0.95,
      "match_reasons": ["room_type_match", "keyword_match"],
      "ai_insights": "brief explanation of why this result is relevant"
    }
  ],
  "enhanced_query": "AI-enhanced version of the original query"
}`;
```

## Usage Examples

### Example 1: Mandir Search

```javascript
const query = "mandir with brass diyas";
const result = await queryIntelligenceService.intelligentSearch(query, 10);

// AI will detect:
// - Room: "prayer room" (from "mandir")
// - Keywords: ["brass", "diyas", "traditional", "religious"]
// - Cultural context: "Hindu religious space"
```

### Example 2: Modern Kitchen Search

```javascript
const query = "modern kitchen with granite countertop";
const result = await queryIntelligenceService.intelligentSearch(query, 10);

// AI will detect:
// - Room: "kitchen"
// - Keywords: ["modern", "granite", "countertop", "contemporary"]
// - Style: "modern/contemporary"
```

### Example 3: Traditional Living Room

```javascript
const query = "traditional living room with jharokha";
const result = await queryIntelligenceService.intelligentSearch(query, 10);

// AI will detect:
// - Room: "living room"
// - Keywords: ["traditional", "jharokha", "classical", "heritage"]
// - Cultural context: "Traditional Indian architectural element"
```

## Testing

Run the AI search tests:

```bash
npm run test-ai-search
```

This will test:
- Room type detection accuracy
- Keyword extraction quality
- Cultural context recognition
- Result enhancement effectiveness

## Configuration

### Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key
```

### Enable/Disable AI Search

```javascript
// Enable AI search (default)
const result = await queryIntelligenceService.enhancedSearch(query, 10, {}, true);

// Disable AI search (fallback to regular search)
const result = await queryIntelligenceService.enhancedSearch(query, 10, {}, false);
```

## Error Handling

The AI search includes robust error handling:

1. **API Failures**: Falls back to regular search
2. **Invalid Responses**: Uses default values
3. **Rate Limits**: Implements retry logic
4. **Network Issues**: Graceful degradation

## Performance Considerations

### Caching

Consider implementing caching for:
- AI room detections
- Keyword extractions
- Enhanced results

### Rate Limiting

- OpenAI API has rate limits
- Implement exponential backoff
- Use fallback for failed requests

### Cost Optimization

- Cache common queries
- Use shorter prompts where possible
- Implement request batching

## Monitoring and Analytics

### AI Search Insights

```javascript
const insights = queryIntelligenceService.getAISearchInsights();
console.log(insights);
// {
//   total_queries: 150,
//   ai_queries: 120,
//   regular_queries: 30,
//   ai_success_rate: "95.83",
//   most_common_ai_detections: [...],
//   ai_confidence_stats: { avg: "0.892", min: "0.750", max: "0.980" }
// }
```

## Future Enhancements

1. **Multi-language Support**: Hindi, Gujarati, Tamil queries
2. **Regional Variations**: State-specific design terminology
3. **Budget Intelligence**: Automatic budget category detection
4. **Style Classification**: Modern, traditional, fusion detection
5. **Personalization**: User preference learning

## Troubleshooting

### Common Issues

1. **High API Costs**
   - Implement caching
   - Use shorter prompts
   - Cache common detections

2. **Slow Response Times**
   - Implement request batching
   - Use async processing
   - Add result caching

3. **Inaccurate Detections**
   - Fine-tune prompts
   - Add more training examples
   - Implement feedback loops

### Debug Mode

Enable detailed logging:

```javascript
// Add to your environment
DEBUG_AI_SEARCH=true

// In the service
if (process.env.DEBUG_AI_SEARCH) {
  console.log('AI Search Debug:', { query, aiResponse, enhancedResults });
}
```

---

**AI Search Status**: ✅ Production Ready
**Last Updated**: December 2024
**Version**: 1.0.0 