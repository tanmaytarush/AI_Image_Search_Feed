/**
 * Simple Keyword API Testing Script
 * Tests search API for interior design keywords and returns basic statistics
 */

import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000/api/images";

// Define the keywords to test
const KEYWORDS = {
  "General Bedroom Design": [
    "Indian bedroom interior design ideas",
    "Modern Indian bedroom designs",
    "Traditional Indian bedroom decor",
    "Contemporary Indian bedrooms",
  ],
  "General Kids Bedroom": [
    "Playful kids bedroom design ideas India",
    "Small space kids room organization hacks",
    "Best color schemes for kids bedroom Indian homes",
  ],
  "General Living Room Design": [
    "Indian living room interior design ideas",
    "Modern Indian living room designs",
    "Traditional Indian living room decor",
    "Contemporary Indian living rooms",
    "Small Indian living room interior design",
  ],
  "General Dining Room Design": [
    "Indian dining room interior design ideas",
    "Modern Indian dining room designs",
    "Traditional Indian dining room decor",
    "Contemporary Indian dining rooms",
    "Small Indian dining room interior design",
  ],
  "General Kitchen Design": [
    "Indian kitchen interior design ideas",
    "Kitchen chimney options for heavy Indian cooking",
    "Modern L-shape kitchen designs with island India",
    "Modular kitchen two-tone color",
    "Modern Indian kitchen designs",
    "Traditional Indian kitchen decor",
  ],
  "Specific Wardrobe Types & Features": [
    "Sliding wardrobe designs",
    "Modular wardrobe designs",
    "Fitted wardrobe designs",
    "Custom wardrobe solutions",
    "Bedroom wardrobe designs",
    "Kids wardrobe designs",
    "Mirrored wardrobe designs",
  ],
  "Specific Pooja Unit Types & Features": [
    "Wall mounted pooja unit designs",
    "Floor standing pooja unit designs",
    "Mandir designs for home",
    "Pooja room designs",
  ],
  "General False Ceiling Design": [
    "Indian false ceiling interior design",
    "Simple modern false ceiling design Indian apartments",
    "Modern Indian false ceiling designs",
    "Traditional Indian false ceiling decor",
    "Contemporary Indian false ceilings",
  ],
  "General Bathroom Design": [
    "Indian bathroom interior design ideas",
    "Modern Indian bathroom designs",
    "Traditional Indian bathroom decor",
    "Contemporary Indian bathrooms",
    "Small Indian bathroom interior design",
    "Luxury Indian bathroom designs",
  ],
  "General TV Unit Design": [
    "Indian TV unit interior design ideas",
    "Modern Indian TV unit designs",
    "Traditional Indian TV unit decor",
    "Contemporary Indian TV units",
    "Small Indian TV unit interior design",
    "Luxury Indian TV unit designs",
    "TV unit design for Indian homes",
  ],
  "Living Room Furniture": [
    "Sofa set designs for Indian living room",
    "Coffee table designs India",
    "Living room furniture ideas Indian homes",
    "TV cabinet designs Indian style",
    "Center table designs for living room",
    "Living room seating arrangement ideas",
    "Modern sofa designs India",
    "Traditional living room furniture",
  ],
  "Bedroom Furniture": [
    "Bed designs for Indian bedroom",
    "Wardrobe designs Indian style",
    "Bedside table designs",
    "Dressing table designs India",
    "Bedroom furniture set designs",
    "Queen size bed designs India",
    "King size bed designs Indian style",
    "Bedroom storage solutions India",
  ],
  "Kitchen Appliances & Storage": [
    "Kitchen cabinet designs India",
    "Kitchen storage solutions",
    "Kitchen island designs Indian homes",
    "Kitchen chimney designs",
    "Kitchen trolley designs",
    "Kitchen pantry designs",
    "Kitchen corner unit designs",
    "Kitchen wall unit designs",
  ],
  "Bathroom Fixtures": [
    "Bathroom vanity designs India",
    "Bathroom storage solutions",
    "Bathroom mirror designs",
    "Bathroom cabinet designs",
    "Bathroom shelf designs",
    "Bathroom organizer designs",
    "Bathroom towel holder designs",
    "Bathroom accessories India",
  ],
  "Lighting & Decor": [
    "Ceiling light designs India",
    "Wall light designs Indian homes",
    "Table lamp designs",
    "Floor lamp designs India",
    "Chandelier designs Indian style",
    "LED lighting designs India",
    "False ceiling lighting designs",
    "Mood lighting designs India",
  ],
  "Flooring & Wall Designs": [
    "Marble flooring designs India",
    "Wooden flooring designs",
    "Wall paneling designs India",
    "Wall texture designs",
    "Wall cladding designs",
    "Floor tile designs India",
    "Wall tile designs",
    "Wall painting designs India",
  ],
  "Storage Solutions": [
    "Shoe rack designs India",
    "Bookshelf designs",
    "Display unit designs India",
    "Storage cabinet designs",
    "Wall mounted storage designs",
    "Corner storage designs India",
    "Multipurpose storage designs",
    "Hidden storage solutions India",
  ],
  "Study & Office": [
    "Study table designs India",
    "Home office designs",
    "Computer table designs",
    "Study room furniture designs",
    "Office chair designs India",
    "Bookshelf designs for study",
    "Study room storage designs",
    "Work from home setup designs",
  ],
  "Kids Room": [
    "Kids bedroom furniture designs",
    "Study table for kids designs",
    "Kids wardrobe designs",
    "Kids room storage solutions",
    "Bunk bed designs India",
    "Kids room theme designs",
    "Kids room wall designs",
    "Kids room lighting designs",
  ],
  "Balcony & Outdoor": [
    "Balcony garden designs India",
    "Balcony seating designs",
    "Outdoor furniture designs",
    "Balcony railing designs",
    "Balcony storage designs",
    "Outdoor lighting designs",
    "Balcony wall designs",
    "Garden furniture designs India",
  ],
  "Color Schemes": [
    "Neutral color interior designs",
    "White and gold interior designs",
    "Beige interior designs India",
    "Grey interior designs",
    "Blue interior designs India",
    "Green interior designs",
    "Pink interior designs India",
    "Brown interior designs",
  ],
  "Style Categories": [
    "Minimalist interior designs India",
    "Scandinavian style Indian homes",
    "Bohemian interior designs",
    "Industrial style interior designs",
    "Vintage interior designs India",
    "Art deco interior designs",
    "Mediterranean style India",
    "Contemporary Indian interior designs",
  ],
  "Space-Specific": [
    "Small apartment interior designs",
    "2BHK interior designs India",
    "3BHK interior designs",
    "Studio apartment designs India",
    "Penthouse interior designs",
    "Villa interior designs India",
    "Duplex interior designs",
    "Independent house interior designs",
  ],
  "Budget Categories": [
    "Budget interior designs India",
    "Affordable interior designs",
    "Luxury interior designs India",
    "Premium interior designs",
    "Economical interior designs",
    "Cost effective interior designs India",
    "Expensive interior designs",
    "High end interior designs India",
  ],
};

/**
 * Calculate relevance score for search results
 * High score for room matches, lower score for pattern/theme matches
 */
function calculateRelevanceScore(results, keyword) {
  if (!results || results.length === 0) return 0;

  let totalRelevance = 0;
  let relevantResults = 0;

  // Break down keyword into individual words for better matching
  const keywordWords = keyword.toLowerCase().split(' ').filter(word => word.length > 2);
  
  for (const result of results) {
    let resultRelevance = 0;
    let matchedWords = 0;

    // Check room_type relevance (HIGH PRIORITY - 0.4 points per match)
    if (result.room_type) {
      const roomTypeLower = result.room_type.toLowerCase();
      for (const word of keywordWords) {
        if (roomTypeLower.includes(word)) {
          resultRelevance += 0.4;
          matchedWords++;
        }
      }
    }

    // Check design_theme relevance (MEDIUM PRIORITY - 0.2 points per match)
    if (result.design_theme) {
      const themeLower = result.design_theme.toLowerCase();
      for (const word of keywordWords) {
        if (themeLower.includes(word)) {
          resultRelevance += 0.2;
          matchedWords++;
        }
      }
    }

    // Check tags relevance (LOWER PRIORITY - 0.15 points per match)
    if (result.tags) {
      const tagsString = JSON.stringify(result.tags).toLowerCase();
      for (const word of keywordWords) {
        if (tagsString.includes(word)) {
          resultRelevance += 0.15;
          matchedWords++;
        }
      }
    }

    // Check search_tags relevance (HIGH PRIORITY - 0.3 points per match)
    if (result.search_tags) {
      const searchTagsString = result.search_tags.join(' ').toLowerCase();
      for (const word of keywordWords) {
        if (searchTagsString.includes(word)) {
          resultRelevance += 0.3;
          matchedWords++;
        }
      }
    }

    // Check tag_match_score relevance (BONUS - up to 0.2 points)
    if (result.tag_match_score) {
      resultRelevance += Math.min(result.tag_match_score / 100, 0.2);
    }

    // Bonus for multiple word matches (0.1 points)
    if (matchedWords >= 2) {
      resultRelevance += 0.1;
    }

    // Consider result relevant if score > 0.3
    if (resultRelevance > 0.3) {
      relevantResults++;
    }

    totalRelevance += Math.min(resultRelevance, 1.0);
  }

  // Calculate percentage of relevant results
  const relevancePercentage =
    results.length > 0 ? (relevantResults / results.length) * 100 : 0;
  const averageRelevanceScore =
    results.length > 0 ? (totalRelevance / results.length) * 100 : 0;

  return {
    relevancePercentage: Math.round(relevancePercentage * 100) / 100,
    averageRelevanceScore: Math.round(averageRelevanceScore * 100) / 100,
    totalResults: results.length,
    relevantResults: relevantResults
  };
}

/**
 * Test search for a single keyword
 */
async function testKeyword(keyword, category) {
  console.log(`🔍 Testing: "${keyword}"`);

  try {
    const response = await fetch(
      `${BASE_URL}/search?query=${encodeURIComponent(keyword)}&limit=20`
    );
    const data = await response.json();

    if (data.success && data.data) {
      const relevance = calculateRelevanceScore(data.data, keyword);

      return {
        category: category,
        keyword: keyword,
        totalResults: data.data.length,
        relevantResults: relevance.relevantResults,
        relevancePercentage: relevance.relevancePercentage,
        averageRelevanceScore: relevance.averageRelevanceScore,
        searchStrategy: data.search_metadata?.search_strategy || "unknown",
        exactSearchEnabled: data.search_metadata?.exact_search_enabled || false,
        exactSearchConfidence: data.search_metadata?.exact_search_confidence || 0,
        imageUrls: data.data?.map(item => item.image_url).join('; ') || '',
        // Sample result data for analysis
        sampleRoomType: data.data[0]?.room_type || '',
        sampleDesignTheme: data.data[0]?.design_theme || '',
        sampleTags: JSON.stringify(data.data[0]?.tags || []),
        sampleSearchTags: data.data[0]?.search_tags?.join(', ') || ''
      };
    } else {
      console.log(
        `❌ Error for "${keyword}": ${data.error || "Unknown error"}`
      );
      return {
        category: category,
        keyword: keyword,
        totalResults: 0,
        relevantResults: 0,
        relevancePercentage: 0,
        averageRelevanceScore: 0,
        searchStrategy: "error",
        exactSearchEnabled: false,
        exactSearchConfidence: 0,
        imageUrls: '',
        sampleRoomType: '',
        sampleDesignTheme: '',
        sampleTags: '',
        sampleSearchTags: ''
      };
    }
  } catch (error) {
    console.log(`❌ Network error for "${keyword}": ${error.message}`);
    return {
      category: category,
      keyword: keyword,
      totalResults: 0,
      relevantResults: 0,
      relevancePercentage: 0,
      averageRelevanceScore: 0,
      searchStrategy: "network_error",
      exactSearchEnabled: false,
      exactSearchConfidence: 0,
      imageUrls: '',
      sampleRoomType: '',
      sampleDesignTheme: '',
      sampleTags: '',
      sampleSearchTags: ''
    };
  }
}

/**
 * Generate CSV content
 */
function generateCSV(results) {
  const headers = [
    "Category",
    "Keyword",
    "Total Results",
    "Relevant Results",
    "Relevance Percentage",
    "Average Relevance Score",
    "Search Strategy",
    "Exact Search Enabled",
    "Exact Search Confidence",
    "Image URLs",
    "Sample Room Type",
    "Sample Design Theme",
    "Sample Tags",
    "Sample Search Tags"
  ];

  const csvRows = [headers.join(",")];

  for (const result of results) {
    const row = [
      `"${result.category}"`,
      `"${result.keyword}"`,
      result.totalResults,
      result.relevantResults,
      result.relevancePercentage,
      result.averageRelevanceScore,
      `"${result.searchStrategy}"`,
      result.exactSearchEnabled,
      result.exactSearchConfidence,
      `"${result.imageUrls}"`,
      `"${result.sampleRoomType}"`,
      `"${result.sampleDesignTheme}"`,
      `"${result.sampleTags}"`,
      `"${result.sampleSearchTags}"`
    ];
    csvRows.push(row.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Calculate summary statistics
 */
function calculateSummaryStats(results) {
  const categoryStats = {};

  for (const result of results) {
    if (!categoryStats[result.category]) {
      categoryStats[result.category] = {
        totalKeywords: 0,
        totalResults: 0,
        totalRelevantResults: 0,
        totalRelevancePercentage: 0,
        totalAverageRelevanceScore: 0,
        successfulSearches: 0,
        failedSearches: 0
      };
    }

    categoryStats[result.category].totalKeywords++;
    categoryStats[result.category].totalResults += (result.totalResults || 0);
    categoryStats[result.category].totalRelevantResults += (result.relevantResults || 0);
    categoryStats[result.category].totalRelevancePercentage += (result.relevancePercentage || 0);
    categoryStats[result.category].totalAverageRelevanceScore += (result.averageRelevanceScore || 0);
    
    if (result.searchStrategy === "error" || result.searchStrategy === "network_error") {
      categoryStats[result.category].failedSearches++;
    } else {
      categoryStats[result.category].successfulSearches++;
    }
  }

  // Calculate averages
  for (const category in categoryStats) {
    const stats = categoryStats[category];
    stats.averageResultsPerKeyword = Math.round(stats.totalResults / stats.totalKeywords);
    stats.averageRelevancePercentage = Math.round((stats.totalRelevancePercentage / stats.totalKeywords) * 100) / 100;
    stats.averageRelevanceScore = Math.round((stats.totalAverageRelevanceScore / stats.totalKeywords) * 100) / 100;
    stats.successRate = Math.round((stats.successfulSearches / stats.totalKeywords) * 100);
  }

  return categoryStats;
}

/**
 * Main analysis function
 */
async function runAnalysis() {
  console.log("🚀 Starting Keyword Relevance Analysis with Proper Scoring\n");

  const allResults = [];

  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    console.log(`📊 Testing category: ${category}`);
    console.log(`   Keywords: ${keywords.length}`);

    for (const keyword of keywords) {
      const result = await testKeyword(keyword, category);
      allResults.push(result);

      console.log(
        `   ✅ "${keyword}" - ${result.relevancePercentage}% relevant (${result.relevantResults}/${result.totalResults})`
      );

      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("");
  }

  // Generate CSV
  const csvContent = generateCSV(allResults);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `keyword_relevance_analysis_${timestamp}.csv`;
  
  // Ensure the data directory exists
  const dataDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filepath = path.join(dataDir, filename);
  fs.writeFileSync(filepath, csvContent);
  console.log(`📄 CSV report saved: ${filepath}`);

  // Calculate and display summary statistics
  const summaryStats = calculateSummaryStats(allResults);

  console.log("\n📈 SUMMARY STATISTICS BY CATEGORY:");
  console.log("=".repeat(80));

  for (const [category, stats] of Object.entries(summaryStats)) {
    console.log(`\n🏷️  ${category}:`);
    console.log(`   Keywords tested: ${stats.totalKeywords}`);
    console.log(`   Total results: ${stats.totalResults}`);
    console.log(`   Total relevant results: ${stats.totalRelevantResults}`);
    console.log(`   Average relevance percentage: ${stats.averageRelevancePercentage}%`);
    console.log(`   Average relevance score: ${stats.averageRelevanceScore}%`);
    console.log(`   Success rate: ${stats.successRate}%`);
  }

  // Overall statistics
  const totalKeywords = allResults.length;
  const totalResults = allResults.reduce((sum, r) => sum + (r.totalResults || 0), 0);
  const totalRelevantResults = allResults.reduce((sum, r) => sum + (r.relevantResults || 0), 0);
  const overallRelevancePercentage = totalResults > 0 ? (totalRelevantResults / totalResults) * 100 : 0;
  const averageRelevanceScore = allResults.reduce((sum, r) => sum + (r.averageRelevanceScore || 0), 0) / totalKeywords;
  const successfulSearches = allResults.filter(r => r.searchStrategy !== "error" && r.searchStrategy !== "network_error").length;

  console.log("\n🎯 OVERALL STATISTICS:");
  console.log("=".repeat(80));
  console.log(`Total keywords tested: ${totalKeywords}`);
  console.log(`Total search results: ${totalResults}`);
  console.log(`Total relevant results: ${totalRelevantResults}`);
  console.log(`Overall relevance percentage: ${Math.round(overallRelevancePercentage * 100) / 100}%`);
  console.log(`Average relevance score: ${Math.round(averageRelevanceScore * 100) / 100}%`);
  console.log(`Overall success rate: ${Math.round((successfulSearches / totalKeywords) * 100)}%`);

  console.log("\n✅ Relevance analysis completed!");
}

// Run analysis if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAnalysis().catch(console.error);
}

export { 
  runAnalysis, 
  testKeyword,
  calculateRelevanceScore
};
