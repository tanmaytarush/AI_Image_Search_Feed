import csv from "csv-parser";
import fs from "fs";
import path from "path";
import qdrantService from "../services/qdrantService.js";
import roomIntelligenceService from "../services/roomIntelligenceService.js";
/**
 * Image Service Utility Functions
 * Pure functions extracted from imageService.js for better maintainability
 */

/**
 * Extract primary search terms that should be preserved in context
 * @param {string} query - The search query
 * @returns {string[]} Array of primary search terms
 */
export function extractPrimarySearchTerms(query) {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter((word) => word.length > 0);

  // Define high-priority terms that should be preserved
  const priorityTerms = [
    // Room types
    "foyer",
    "entryway",
    "living",
    "bedroom",
    "kitchen",
    "bathroom",
    "dining",
    "study",
    "office",
    "prayer",
    "pooja",
    "mandir",
    "temple",
    "wardrobe",
    "closet",
    "balcony",
    "terrace",
    "utility",
    "laundry",
    // Specific objects
    "sofa",
    "bed",
    "table",
    "chair",
    "cabinet",
    "shelf",
    "mirror",
    "lamp",
    "tv",
    "television",
    "curtain",
    "cushion",
    "carpet",
    "rug",
    // Materials
    "wood",
    "leather",
    "fabric",
    "glass",
    "metal",
    "marble",
    "granite",
    "brass",
    "copper",
    // Colors
    "white",
    "black",
    "brown",
    "beige",
    "blue",
    "green",
    "red",
    "yellow",
    "pink",
    "purple",
  ];

  // Find words that match priority terms
  const primaryTerms = words.filter((word) =>
    priorityTerms.some((term) => word.includes(term) || term.includes(word))
  );

  // If no priority terms found, use the first word as primary
  if (primaryTerms.length === 0 && words.length > 0) {
    primaryTerms.push(words[0]);
  }

  return primaryTerms;
}

/**
 * Simple similarity calculation between two words
 * @param {string} word1 - First word
 * @param {string} word2 - Second word
 * @returns {number} Similarity score between 0 and 1
 */
export function calculateSimilarity(word1, word2) {
  const longer = word1.length > word2.length ? word1 : word2;
  const shorter = word1.length > word2.length ? word2 : word1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance calculation between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
export function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Check if any query word matches any tag in the payload
 * @param {Object} payload - The image payload
 * @param {string[]} queryWords - Array of query words
 * @param {string} queryLower - Lowercase query string
 * @returns {boolean} True if there's a match
 */
export function checkTagMatch(payload, queryWords, queryLower) {
  // Check exact phrase match first
  if (
    queryLower.includes(payload.room_type?.toLowerCase()) ||
    queryLower.includes(payload.design_theme?.toLowerCase()) ||
    queryLower.includes(payload.budget_category?.toLowerCase()) ||
    queryLower.includes(payload.space_type?.toLowerCase())
  ) {
    return true;
  }

  // Check all tag fields comprehensively
  const tagFields = [
    payload.room_type,
    payload.design_theme,
    payload.budget_category,
    payload.space_type,
    ...(payload.tags?.colors || []),
    ...(payload.tags?.materials || []),
    ...(payload.tags?.primary_features || []),
    ...(payload.tags?.object_types || []),
    payload.tags?.functionality,
    payload.tags?.regional_style,
    ...(payload.indian_context?.traditional_elements || []),
    ...(payload.indian_context?.modern_adaptations || []),
    payload.indian_context?.cultural_significance,

    // Check ai_generated_tags structure comprehensively
    payload.ai_generated_tags?.room,
    payload.ai_generated_tags?.theme,
    ...(payload.ai_generated_tags?.primary_features || []),
    ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
    ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
    ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
    ...(payload.ai_generated_tags?.objects?.flatMap(
      (obj) => obj.materials || []
    ) || []),
    ...(payload.ai_generated_tags?.objects?.flatMap(
      (obj) => obj.features || []
    ) || []),
    ...(payload.ai_generated_tags?.indian_context?.traditional_elements || []),
    ...(payload.ai_generated_tags?.indian_context?.modern_adaptations || []),
    payload.ai_generated_tags?.indian_context?.cultural_significance,
    ...(payload.ai_generated_tags?.metadata?.tags || []),

    // Check original_analysis structure if it exists
    payload.original_analysis?.ai_generated_tags?.room,
    payload.original_analysis?.ai_generated_tags?.theme,
    ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
    ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
      ?.colors || []),
    ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
      ?.materials || []),
    ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
      (obj) => obj.type
    ) || []),
    ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
      (obj) => obj.materials || []
    ) || []),
    ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
      (obj) => obj.features || []
    ) || []),
    ...(payload.original_analysis?.ai_generated_tags?.indian_context
      ?.traditional_elements || []),
    ...(payload.original_analysis?.ai_generated_tags?.indian_context
      ?.modern_adaptations || []),
    payload.original_analysis?.ai_generated_tags?.indian_context
      ?.cultural_significance,
    ...(payload.original_analysis?.ai_generated_tags?.metadata?.tags || []),

    // Check search_tags if available
    ...(payload.search_tags || []),
  ].filter(Boolean);

  // Check if any query word matches any tag
  const hasMatch = queryWords.some((queryWord) =>
    tagFields.some((tag) => {
      const tagLower = tag.toLowerCase();
      const queryWordLower = queryWord.toLowerCase();

      // Exact match
      if (
        tagLower.includes(queryWordLower) ||
        queryWordLower.includes(tagLower)
      ) {
        return true;
      }

      // Partial match for common abbreviations
      if (queryWordLower === "tv" && tagLower.includes("television")) {
        return true;
      }
      if (queryWordLower === "television" && tagLower.includes("tv")) {
        return true;
      }

      // Check for word boundaries (more flexible matching)
      const tagWords = tagLower.split(/\s+/);
      return tagWords.some(
        (tagWord) =>
          tagWord.includes(queryWordLower) || queryWordLower.includes(tagWord)
      );
    })
  );

  return hasMatch;
}

/**
 * Extract all object-related tags from payload
 * @param {Object} payload - The image payload
 * @returns {string[]} Array of object tags
 */
export function extractObjectTags(payload) {
  const tags = [];

  // Basic tags
  if (payload.tags) {
    tags.push(...(payload.tags.object_types || []));
    tags.push(...(payload.tags.primary_features || []));
    tags.push(...(payload.tags.materials || []));
    tags.push(...(payload.tags.colors || []));
    if (payload.tags.functionality) tags.push(payload.tags.functionality);
  }

  // AI generated tags
  if (payload.ai_generated_tags) {
    tags.push(
      ...(payload.ai_generated_tags.objects?.map((obj) => obj.type) || [])
    );
    tags.push(...(payload.ai_generated_tags.primary_features || []));
    tags.push(...(payload.ai_generated_tags.visual_attributes?.colors || []));
    tags.push(
      ...(payload.ai_generated_tags.visual_attributes?.materials || [])
    );
    tags.push(
      ...(payload.ai_generated_tags.objects?.flatMap(
        (obj) => obj.materials || []
      ) || [])
    );
    tags.push(
      ...(payload.ai_generated_tags.objects?.flatMap(
        (obj) => obj.features || []
      ) || [])
    );
  }

  // Original analysis tags
  if (payload.original_analysis?.ai_generated_tags) {
    tags.push(
      ...(payload.original_analysis.ai_generated_tags.objects?.map(
        (obj) => obj.type
      ) || [])
    );
    tags.push(
      ...(payload.original_analysis.ai_generated_tags.primary_features || [])
    );
    tags.push(
      ...(payload.original_analysis.ai_generated_tags.visual_attributes
        ?.colors || [])
    );
    tags.push(
      ...(payload.original_analysis.ai_generated_tags.visual_attributes
        ?.materials || [])
    );
    tags.push(
      ...(payload.original_analysis.ai_generated_tags.objects?.flatMap(
        (obj) => obj.materials || []
      ) || [])
    );
    tags.push(
      ...(payload.original_analysis.ai_generated_tags.objects?.flatMap(
        (obj) => obj.features || []
      ) || [])
    );
  }

  // Search tags
  if (payload.search_tags) {
    tags.push(...payload.search_tags);
  }

  return tags.filter(Boolean);
}

/**
 * Check if a tag is an object type
 * @param {string} tag - The tag to check
 * @param {Object} payload - The image payload
 * @returns {boolean} True if the tag is an object type
 */
export function isObjectType(tag, payload) {
  const objectTypes = [
    ...(payload.tags?.object_types || []),
    ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
    ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
      (obj) => obj.type
    ) || []),
  ];
  return objectTypes.some(
    (objType) => objType.toLowerCase() === tag.toLowerCase()
  );
}

/**
 * Check if a tag is a primary feature
 * @param {string} tag - The tag to check
 * @param {Object} payload - The image payload
 * @returns {boolean} True if the tag is a primary feature
 */
export function isPrimaryFeature(tag, payload) {
  const primaryFeatures = [
    ...(payload.tags?.primary_features || []),
    ...(payload.ai_generated_tags?.primary_features || []),
    ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
  ];
  return primaryFeatures.some(
    (feature) => feature.toLowerCase() === tag.toLowerCase()
  );
}

/**
 * Check if a tag is a material
 * @param {string} tag - The tag to check
 * @param {Object} payload - The image payload
 * @returns {boolean} True if the tag is a material
 */
export function isMaterial(tag, payload) {
  const materials = [
    ...(payload.tags?.materials || []),
    ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
    ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
      ?.materials || []),
    ...(payload.ai_generated_tags?.objects?.flatMap(
      (obj) => obj.materials || []
    ) || []),
    ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
      (obj) => obj.materials || []
    ) || []),
  ];
  return materials.some(
    (material) => material.toLowerCase() === tag.toLowerCase()
  );
}

/**
 * Check if a tag is a color
 * @param {string} tag - The tag to check
 * @param {Object} payload - The image payload
 * @returns {boolean} True if the tag is a color
 */
export function isColor(tag, payload) {
  const colors = [
    ...(payload.tags?.colors || []),
    ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
    ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
      ?.colors || []),
  ];
  return colors.some((color) => color.toLowerCase() === tag.toLowerCase());
}

/**
 * Check if a tag is functionality
 * @param {string} tag - The tag to check
 * @param {Object} payload - The image payload
 * @returns {boolean} True if the tag is functionality
 */
export function isFunctionality(tag, payload) {
  return payload.tags?.functionality?.toLowerCase() === tag.toLowerCase();
}

/**
 * Get matched objects for a payload
 * @param {Object} payload - The image payload
 * @param {string[]} queryWords - Array of query words
 * @returns {Array} Array of matched objects
 */
export function getMatchedObjects(payload, queryWords) {
  const matchedObjects = [];
  const objectTags = extractObjectTags(payload);

  for (const queryWord of queryWords) {
    for (const tag of objectTags) {
      if (
        tag.toLowerCase().includes(queryWord) ||
        queryWord.includes(tag.toLowerCase())
      ) {
        matchedObjects.push({
          tag: tag,
          queryWord: queryWord,
          type: getTagType(tag, payload),
        });
      }
    }
  }

  return matchedObjects;
}

/**
 * Get the type of a tag
 * @param {string} tag - The tag to check
 * @param {Object} payload - The image payload
 * @returns {string} The type of the tag
 */
export function getTagType(tag, payload) {
  if (isObjectType(tag, payload)) return "object_type";
  if (isPrimaryFeature(tag, payload)) return "primary_feature";
  if (isMaterial(tag, payload)) return "material";
  if (isColor(tag, payload)) return "color";
  if (isFunctionality(tag, payload)) return "functionality";
  return "visual_attribute";
}

/**
 * Calculate object relevance score
 * @param {Object} payload - The image payload
 * @param {string[]} queryWords - Array of query words
 * @returns {number} Relevance score
 */
export function calculateObjectRelevance(payload, queryWords) {
  let relevance = 0;
  const objectTags = extractObjectTags(payload);

  for (const queryWord of queryWords) {
    for (const tag of objectTags) {
      const similarity = calculateSimilarity(
        queryWord.toLowerCase(),
        tag.toLowerCase()
      );
      relevance += similarity;
    }
  }

  return relevance / Math.max(queryWords.length, 1);
}

/**
 * Merge object search results from different search methods
 * @param {Array} semanticResults - Semantic search results
 * @param {Array} exactResults - Exact search results
 * @param {Array} objectResults - Object search results
 * @param {string} query - Search query
 * @returns {Array} Merged and ranked results
 */
export function mergeObjectSearchResults(
  semanticResults,
  exactResults,
  objectResults,
  query
) {
  const merged = new Map();

  // Add semantic results
  semanticResults.forEach((result) => {
    merged.set(result.id, {
      ...result,
      searchCount: 1,
      vectorMatches: ["semantic"],
      score: result.score || 0,
    });
  });

  // Add exact results
  exactResults.forEach((result) => {
    if (merged.has(result.id)) {
      const existing = merged.get(result.id);
      existing.searchCount = (existing.searchCount || 0) + 1;
      existing.vectorMatches.push("exact");
      existing.score = Math.max(existing.score, result.exactMatchScore || 0);
      existing.exactMatchBoost = true;
    } else {
      merged.set(result.id, {
        ...result,
        searchCount: 1,
        vectorMatches: ["exact"],
        score: result.exactMatchScore || 0,
        exactMatchBoost: true,
      });
    }
  });

  // Add object results
  objectResults.forEach((result) => {
    if (merged.has(result.id)) {
      const existing = merged.get(result.id);
      existing.searchCount = (existing.searchCount || 0) + 1;
      existing.vectorMatches.push("object_tag");
      existing.score = Math.max(existing.score, result.objectMatchScore || 0);
      existing.objectMatchScore = result.objectMatchScore || 0;
      existing.matchedObjects = result.matchedObjects || [];
      existing.objectRelevance = result.objectRelevance || 0;
    } else {
      merged.set(result.id, {
        ...result,
        searchCount: 1,
        vectorMatches: ["object_tag"],
        score: result.objectMatchScore || 0,
        objectMatchScore: result.objectMatchScore || 0,
        matchedObjects: result.matchedObjects || [],
        objectRelevance: result.objectRelevance || 0,
      });
    }
  });

  return Array.from(merged.values());
}

/**
 * Apply intelligent filtering for object search results
 * @param {Array} results - Search results to filter
 * @param {string} query - Search query
 * @returns {Array} Filtered results
 */
export function applyObjectSearchFiltering(results, query) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((word) => word.length > 0);

  return results.filter((result) => {
    // Filter out results with zero scores (from compound query logic)
    if (
      result.score === 0 &&
      result.objectMatchScore === 0 &&
      result.exactMatchScore === 0
    ) {
      return false;
    }

    // Keep results with high object relevance
    if (result.objectRelevance > 0.3) return true;

    // Keep results with exact matches
    if (result.exactMatchBoost) return true;

    // Keep results with high semantic similarity
    if (result.score > 0.5) return true;

    // Keep results with multiple search method matches
    if (result.searchCount > 1) return true;

    return false;
  });
}

/**
 * Sort object search results by relevance
 * @param {Array} results - Results to sort
 * @param {string} query - Search query
 * @returns {Array} Sorted results
 */
export function sortObjectSearchResults(results, query) {
  return results.sort((a, b) => {
    // Primary sort: object relevance
    const relevanceA = a.objectRelevance || 0;
    const relevanceB = b.objectRelevance || 0;
    if (relevanceA !== relevanceB) return relevanceB - relevanceA;

    // Secondary sort: exact match boost
    const exactA = a.exactMatchBoost ? 1 : 0;
    const exactB = b.exactMatchBoost ? 1 : 0;
    if (exactA !== exactB) return exactB - exactA;

    // Tertiary sort: search count
    const countA = a.searchCount || 0;
    const countB = b.searchCount || 0;
    if (countA !== countB) return countB - countA;

    // Quaternary sort: semantic score
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    return scoreB - scoreA;
  });
}

/**
 * Merge focused search results
 * @param {Array} exactResults - Exact search results
 * @param {Array} semanticResults - Semantic search results
 * @param {Object} roomAnalysis - Room analysis data
 * @param {Object} stylePreferences - Style preferences
 * @returns {Array} Merged and sorted results
 */
export function mergeFocusedResults(
  exactResults,
  semanticResults,
  roomAnalysis,
  stylePreferences
) {
  const merged = [];
  const seenIds = new Set();

  // Add exact matches first (highest priority)
  for (const result of exactResults) {
    if (!seenIds.has(result.id)) {
      result.searchType = "exact";
      result.roomType = roomAnalysis.primaryRoomType;
      result.stylePreferences = stylePreferences;
      merged.push(result);
      seenIds.add(result.id);
    }
  }

  // Add semantic matches
  for (const result of semanticResults) {
    if (!seenIds.has(result.id)) {
      result.searchType = "semantic";
      result.roomType = roomAnalysis.primaryRoomType;
      result.stylePreferences = stylePreferences;
      merged.push(result);
      seenIds.add(result.id);
    }
  }

  // Sort by relevance
  merged.sort((a, b) => {
    // Exact matches get priority
    if (a.searchType === "exact" && b.searchType !== "exact") return -1;
    if (a.searchType !== "exact" && b.searchType === "exact") return 1;

    // Then by score
    const scoreA = a.exactMatchScore || a.aiRelevanceScore || 0;
    const scoreB = b.exactMatchScore || b.aiRelevanceScore || 0;
    return scoreB - scoreA;
  });

  return merged;
}

/**
 * Filter results by room type to ensure only relevant results
 * @param {Array} results - Results to filter
 * @param {string} targetRoomType - Target room type
 * @returns {Array} Filtered results
 */
export async function filterByRoomType(results, targetRoomType) {
  const filteredResults = [];
  for (const result of results) {
    const roomTypeMatch = await checkRoomTypeMatch(
      result.payload,
      targetRoomType
    );
    if (roomTypeMatch) {
      filteredResults.push(result);
    }
  }
  return filteredResults;
}

/**
 * Calculate tag match score for a payload
 * @param {Object} payload - The image payload
 * @param {string[]} queryWords - Array of query words
 * @param {string} queryLower - Lowercase query string
 * @returns {number} Tag match score (0-100)
 */
export function calculateTagMatchScore(payload, queryWords, queryLower) {
  let score = 0;
  const maxPossibleScore = 100; // Normalize to 0-100 scale

  // Track matched categories to avoid double-counting
  const matchedCategories = new Set();

  // Check exact matches with higher weight
  if (queryLower.includes(payload.room_type?.toLowerCase())) {
    score += 25; // Room type is very important
    matchedCategories.add("room_type");
  }
  if (queryLower.includes(payload.design_theme?.toLowerCase())) {
    score += 20; // Design theme is important
    matchedCategories.add("design_theme");
  }

  // Check comprehensive tag matches from all structures
  const allTags = [
    // Basic tags
    ...(payload.tags?.colors || []),
    ...(payload.tags?.materials || []),
    ...(payload.tags?.primary_features || []),
    ...(payload.tags?.object_types || []),
    payload.tags?.functionality,
    payload.tags?.regional_style,
    ...(payload.indian_context?.traditional_elements || []),
    ...(payload.indian_context?.modern_adaptations || []),
    payload.indian_context?.cultural_significance,

    // ai_generated_tags structure
    payload.ai_generated_tags?.room,
    payload.ai_generated_tags?.theme,
    ...(payload.ai_generated_tags?.primary_features || []),
    ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
    ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
    ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
    ...(payload.ai_generated_tags?.objects?.flatMap(
      (obj) => obj.materials || []
    ) || []),
    ...(payload.ai_generated_tags?.objects?.flatMap(
      (obj) => obj.features || []
    ) || []),
    ...(payload.ai_generated_tags?.indian_context?.traditional_elements || []),
    ...(payload.ai_generated_tags?.indian_context?.modern_adaptations || []),
    payload.ai_generated_tags?.indian_context?.cultural_significance,
    ...(payload.ai_generated_tags?.metadata?.tags || []),

    // original_analysis structure
    payload.original_analysis?.ai_generated_tags?.room,
    payload.original_analysis?.ai_generated_tags?.theme,
    ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
    ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
      ?.colors || []),
    ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
      ?.materials || []),
    ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
      (obj) => obj.type
    ) || []),
    ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
      (obj) => obj.materials || []
    ) || []),
    ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
      (obj) => obj.features || []
    ) || []),
    ...(payload.original_analysis?.ai_generated_tags?.indian_context
      ?.traditional_elements || []),
    ...(payload.original_analysis?.ai_generated_tags?.indian_context
      ?.modern_adaptations || []),
    payload.original_analysis?.ai_generated_tags?.indian_context
      ?.cultural_significance,
    ...(payload.original_analysis?.ai_generated_tags?.metadata?.tags || []),

    // search_tags
    ...(payload.search_tags || []),
  ].filter(Boolean);

  // Track unique matches to avoid over-counting
  const uniqueMatches = new Set();

  queryWords.forEach((queryWord) => {
    allTags.forEach((tag) => {
      if (
        tag.toLowerCase().includes(queryWord) ||
        queryWord.includes(tag.toLowerCase())
      ) {
        const matchKey = `${queryWord}-${tag}`;
        if (uniqueMatches.has(matchKey)) return; // Skip duplicate matches
        uniqueMatches.add(matchKey);

        // Assign weight based on field type with object/room priority (only once per category)
        if (
          !matchedCategories.has("object_types") &&
          (payload.tags?.object_types?.includes(tag) ||
            payload.ai_generated_tags?.objects?.some(
              (obj) => obj.type === tag
            ) ||
            payload.original_analysis?.ai_generated_tags?.objects?.some(
              (obj) => obj.type === tag
            ))
        ) {
          score += 25; // Object types are highest priority
          matchedCategories.add("object_types");
        } else if (
          !matchedCategories.has("primary_features") &&
          (payload.tags?.primary_features?.includes(tag) ||
            payload.ai_generated_tags?.primary_features?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.primary_features?.includes(
              tag
            ))
        ) {
          score += 20; // Primary features are high priority
          matchedCategories.add("primary_features");
        } else if (
          !matchedCategories.has("materials") &&
          (payload.tags?.materials?.includes(tag) ||
            payload.ai_generated_tags?.visual_attributes?.materials?.includes(
              tag
            ) ||
            payload.original_analysis?.ai_generated_tags?.visual_attributes?.materials?.includes(
              tag
            ))
        ) {
          score += 15; // Materials are high priority
          matchedCategories.add("materials");
        } else if (
          !matchedCategories.has("colors") &&
          (payload.tags?.colors?.includes(tag) ||
            payload.ai_generated_tags?.visual_attributes?.colors?.includes(
              tag
            ) ||
            payload.original_analysis?.ai_generated_tags?.visual_attributes?.colors?.includes(
              tag
            ))
        ) {
          score += 12; // Colors are medium-high priority
          matchedCategories.add("colors");
        } else if (
          !matchedCategories.has("functionality") &&
          (payload.tags?.functionality === tag ||
            payload.ai_generated_tags?.metadata?.functionality === tag ||
            payload.original_analysis?.ai_generated_tags?.metadata
              ?.functionality === tag)
        ) {
          score += 10; // Functionality is medium priority
          matchedCategories.add("functionality");
        } else if (
          !matchedCategories.has("regional_style") &&
          (payload.tags?.regional_style === tag ||
            payload.ai_generated_tags?.indian_context?.regional_style === tag ||
            payload.original_analysis?.ai_generated_tags?.indian_context
              ?.regional_style === tag)
        ) {
          score += 8; // Regional style is lower priority (style)
          matchedCategories.add("regional_style");
        } else if (
          !matchedCategories.has("traditional_elements") &&
          (payload.indian_context?.traditional_elements?.includes(tag) ||
            payload.ai_generated_tags?.indian_context?.traditional_elements?.includes(
              tag
            ) ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.traditional_elements?.includes(
              tag
            ))
        ) {
          score += 6; // Traditional elements are lower priority (style)
          matchedCategories.add("traditional_elements");
        } else if (
          !matchedCategories.has("modern_adaptations") &&
          (payload.indian_context?.modern_adaptations?.includes(tag) ||
            payload.ai_generated_tags?.indian_context?.modern_adaptations?.includes(
              tag
            ) ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.modern_adaptations?.includes(
              tag
            ))
        ) {
          score += 6; // Modern adaptations are lower priority (style)
          matchedCategories.add("modern_adaptations");
        } else if (
          !matchedCategories.has("cultural_significance") &&
          (payload.indian_context?.cultural_significance === tag ||
            payload.ai_generated_tags?.indian_context?.cultural_significance ===
              tag ||
            payload.original_analysis?.ai_generated_tags?.indian_context
              ?.cultural_significance === tag)
        ) {
          score += 6; // Cultural significance is lower priority (style)
          matchedCategories.add("cultural_significance");
        } else if (payload.search_tags?.includes(tag)) {
          score += 5; // Lower weight for search tags
        } else {
          score += 3; // Default weight for other matches
        }
      }
    });
  });

  // Compound query logic: If multiple query words, require ALL to match for high score
  if (queryWords.length > 1) {
    const matchedQueryWords = new Set();

    // Count how many query words were matched
    queryWords.forEach((queryWord) => {
      allTags.forEach((tag) => {
        if (
          tag.toLowerCase().includes(queryWord.toLowerCase()) ||
          queryWord.toLowerCase().includes(tag.toLowerCase())
        ) {
          matchedQueryWords.add(queryWord);
        }
      });
    });

    // If not all query words matched, reduce score significantly
    if (matchedQueryWords.size < queryWords.length) {
      score = score * (matchedQueryWords.size / queryWords.length) * 0.1; // Much stricter penalty
    }

    // For compound queries, require at least 2 words to match
    if (matchedQueryWords.size < Math.min(2, queryWords.length)) {
      score = 0; // No score if not enough words match
    }
  }

  // Normalize score to 0-100 range
  return Math.min(score, maxPossibleScore);
}

/**
 * Check if a payload matches the specified room type
 * @param {Object} payload - The image payload
 * @param {string} targetRoomType - Target room type
 * @returns {boolean} True if room type matches
 */
export async function checkRoomTypeMatch(payload, targetRoomType) {
  try {
    const payloadRoomType = payload.room_type?.toLowerCase() || "";
    const aiRoomType = payload.ai_generated_tags?.room?.toLowerCase() || "";

    // Get room concepts for the target room type
    const targetConcepts =
      await roomIntelligenceService.getRoomConceptsForCategory(targetRoomType);
    const normalizedConcepts = targetConcepts.map((c) =>
      c.trim().toLowerCase()
    );

    // Split payload room types on '/' and check each part for an exact match
    const payloadRoomTypeParts = payloadRoomType
      .split("/")
      .map((part) => part.trim());
    const aiRoomTypeParts = aiRoomType.split("/").map((part) => part.trim());

    // Check if any part matches exactly
    for (const part of payloadRoomTypeParts) {
      if (normalizedConcepts.includes(part)) {
        return true;
      }
    }
    for (const part of aiRoomTypeParts) {
      if (normalizedConcepts.includes(part)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking room type match:", error);
    return false;
  }
}

/**
 * Validate that all embeddings use 384 dimensions
 * @param {Array} embedding - The embedding to validate
 * @param {string} context - Context for error messages
 * @returns {boolean} True if valid
 */
export function validateEmbeddingDimensions(embedding, context = "unknown") {
  if (!Array.isArray(embedding) || embedding.length !== 384) {
    throw new Error(
      `Invalid embedding dimensions in ${context}: expected 384, got ${
        embedding?.length || "undefined"
      }`
    );
  }
  return true;
}

/**
 * Get embedding with validation for 384 dimensions
 * @param {string} text - Text to embed
 * @param {string} context - Context for embedding
 * @returns {Promise<Array>} Validated embedding
 */
export async function getValidatedEmbedding(text, context = "search") {
  const embedding = await qdrantService.getEmbedding(text);
  validateEmbeddingDimensions(embedding, context);
  return embedding;
}

/**
 * Construct proper image URL from image_id and stored data
 * @param {string} imageId - The image ID
 * @param {Object} payload - The image payload
 * @returns {Promise<string|null>} Image URL or null
 */
export async function constructImageUrl(imageId, payload) {
  try {
    // PRIORITY 1: Direct image_url from Qdrant DB (most efficient)
    if (payload?.image_url) {
      console.log(
        `✅ Found direct image URL from Qdrant for ${imageId}: ${payload.image_url.substring(
          0,
          50
        )}...`
      );
      return payload.image_url;
    }

    // PRIORITY 2: Try to get the CSV image_id from original_id (fallback)
    const csvImageId = payload?.original_id;

    if (csvImageId) {
      // Load the CSV mapping if not already loaded
      const imageIdToUrl = await loadImageIdToUrlMapping();

      // Look up the URL using the CSV image_id
      const imageUrl = imageIdToUrl[csvImageId];

      if (imageUrl) {
        console.log(
          `✅ Found image URL from CSV mapping for ${imageId} (${csvImageId}): ${imageUrl.substring(
            0,
            50
          )}...`
        );
        return imageUrl;
      }
    }

    // PRIORITY 3: Try other possible locations for the image URL
    const possibleUrls = [
      payload?.analysis?.image_url,
      payload?.analysis?.imageUrl,
      payload?.ai_generated_tags?.imageUrl,
      payload?.ai_generated_tags?.image_url,
    ];

    // Find the first valid URL
    const fallbackUrl = possibleUrls.find(
      (url) => url && typeof url === "string" && url.length > 0
    );

    if (fallbackUrl) {
      console.log(
        `✅ Found fallback image URL for ${imageId}: ${fallbackUrl.substring(
          0,
          50
        )}...`
      );
      return fallbackUrl;
    }

    console.warn(`⚠️ No image URL found for image_id: ${imageId}`);
    return null;
  } catch (error) {
    console.error(`Error constructing image URL for ${imageId}:`, error);
    return null;
  }
}

/**
 * Load image_id to image_url mapping from CSV (cached)
 * @returns {Promise<Object>} Mapping object
 */
export async function loadImageIdToUrlMapping() {
  if (imageIdToUrlCache) return imageIdToUrlCache;

  const mapping = {};
  const csvPath = path.join(process.cwd(), "src/data/interior-image-urls.csv");

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        if (row.image_id && row.image_url) {
          mapping[row.image_id] = row.image_url;
        }
      })
      .on("end", () => {
        imageIdToUrlCache = mapping;
        resolve(mapping);
      })
      .on("error", reject);
  });
}

// Cache for image_id to image_url mapping
let imageIdToUrlCache = null;
