// API Configuration
const API_BASE_URL = "http://localhost:3000/api";

// DOM Elements
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const status = document.getElementById("status");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const imagesGrid = document.getElementById("imagesGrid");

// State
let currentImages = [];
let isSearching = false;

// Event Listeners
searchBtn.addEventListener("click", handleSearch);
clearBtn.addEventListener("click", handleClear);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleSearch();
  }
});

// Load all images on page load
document.addEventListener("DOMContentLoaded", () => {
  loadAllImages();
  setupSearchSuggestions();
});

// Setup search suggestions
function setupSearchSuggestions() {
  // AI-powered search suggestions based on room categories and features
  const suggestions = [
    // Room types (AI-detected)
    "living room", "bedroom", "kitchen", "bathroom", "dining room", 
    "puja room", "pooja room", "prayer room", "wardrobe", "closet",
    "home office", "study room", "entryway", "foyer", "balcony",
    
    // Features and materials
    "tv", "television", "sofa", "bed", "wardrobe", "marble", "wood", 
    "modern", "traditional", "minimalist", "luxury", "budget",
    
    // Cultural and regional terms
    "indian", "traditional indian", "modern indian", "contemporary indian",
    "mandir", "temple", "worship", "prayer"
  ];
  
  // Add placeholder with AI-powered suggestions
  searchInput.placeholder = "Search for rooms like: living room, puja room, kitchen... or features like: tv, marble, modern...";
}

// Handle Search
async function handleSearch() {
  const query = searchInput.value.trim();

  if (query === "") {
    // If search is empty, load all images
    loadAllImages();
    return;
  }

  setLoading(true);
  setError("");

  try {
    const searchResults = await searchImages(query);
    
    if (searchResults.images.length === 0) {
      displayImages([], `No results found for "${query}". Try different keywords or browse all images.`);
    } else {
      displayImages(searchResults.images, `Found ${searchResults.images.length} images matching "${query}"`, searchResults.metadata);
    }
  } catch (err) {
    setError(`Search failed: ${err.message}`);
    console.error("Search error:", err);
  } finally {
    setLoading(false);
  }
}

// Handle Clear
function handleClear() {
  searchInput.value = "";
  loadAllImages();
}

// Load All Images from CSV
async function loadAllImages() {
  setLoading(true);
  setError("");

  try {
    const response = await fetch(`${API_BASE_URL}/images`);
    const data = await response.json();

    if (data.success) {
      displayImages(data.data, `All Images (${data.data.length} total)`);
    } else {
      throw new Error(data.message || "Failed to load images");
    }
  } catch (err) {
    setError(`Failed to load images: ${err.message}`);
    console.error("Load images error:", err);
  } finally {
    setLoading(false);
  }
}

// Search Images in QdrantDB
async function searchImages(query) {
  const response = await fetch(
    `${API_BASE_URL}/images/search?query=${encodeURIComponent(query)}&limit=10`
  );
  const data = await response.json();

  if (data.success) {
    return {
      images: data.data,
      metadata: data.search_metadata
    };
  } else {
    throw new Error(data.message || "Search failed");
  }
}

// Display Images
function displayImages(images, title, searchMetadata = null) {
  currentImages = images;

  if (images.length === 0) {
    imagesGrid.innerHTML = `
      <div class="no-results">
        <h3>No images found</h3>
        <p>Try a different search term or browse all images</p>
      </div>
    `;
    setStatus(title);
    return;
  }

  const imagesHTML = images.map((image) => createImageCard(image)).join("");
  imagesGrid.innerHTML = imagesHTML;
  
  // Add AI insights if available
  if (searchMetadata && searchMetadata.search_insights) {
    const insights = searchMetadata.search_insights;
    const insightsHTML = createInsightsCard(insights);
    imagesGrid.insertAdjacentHTML('afterbegin', insightsHTML);
  }
  
  setStatus(title);
}

// Create Image Card HTML
function createImageCard(image) {
  const scoreHtml = image.score
    ? `<div class="match-score">Match: ${(image.score * 100).toFixed(1)}%</div>`
    : "";

  const roomTypeHtml = image.room_type
    ? `<div class="metadata-item"><strong>Room:</strong> ${image.room_type}</div>`
    : "";

  const designThemeHtml = image.design_theme
    ? `<div class="metadata-item"><strong>Style:</strong> ${image.design_theme}</div>`
    : "";

  // Generate tags display
  const tagsHtml = generateTagsDisplay(image.tags || {});

  // Generate additional metadata
  const additionalInfoHtml = generateAdditionalInfo(image);

  // Generate user-friendly title
  const imageTitle = generateImageTitle(image);

  // Get image URL from the correct location
  const imageUrl = image.image_url || image.original_analysis?.imageUrl || "";

  return `
    <div class="image-card" onclick="openImageModal('${imageUrl}', '${imageTitle}')">
      <div class="image-container">
        <img 
          src="${imageUrl}" 
          alt="${imageTitle}"
          loading="lazy"
          onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDMwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTI1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBsb2FkIGVycm9yPC90ZXh0Pgo8L3N2Zz4K'"
        >
        ${scoreHtml}
      </div>
      <div class="image-info">
        <div class="image-title">${imageTitle}</div>
        ${roomTypeHtml}
        ${designThemeHtml}
        ${tagsHtml}
        ${additionalInfoHtml}
      </div>
    </div>
  `;
}

// Generate tags display
function generateTagsDisplay(tags) {
  if (!tags || Object.keys(tags).length === 0) return "";

  let tagsHtml = '<div class="tags-section">';

  // Colors
  if (tags.colors && tags.colors.length > 0) {
    tagsHtml += `<div class="tag-group">
      <span class="tag-label">Colors:</span>
      <div class="tag-items">
        ${tags.colors
          .map((color) => `<span class="tag color-tag">${color}</span>`)
          .join("")}
      </div>
    </div>`;
  }

  // Materials
  if (tags.materials && tags.materials.length > 0) {
    tagsHtml += `<div class="tag-group">
      <span class="tag-label">Materials:</span>
      <div class="tag-items">
        ${tags.materials
          .map(
            (material) => `<span class="tag material-tag">${material}</span>`
          )
          .join("")}
      </div>
    </div>`;
  }

  // Primary features
  if (tags.primary_features && tags.primary_features.length > 0) {
    tagsHtml += `<div class="tag-group">
      <span class="tag-label">Features:</span>
      <div class="tag-items">
        ${tags.primary_features
          .map((feature) => `<span class="tag feature-tag">${feature}</span>`)
          .join("")}
      </div>
    </div>`;
  }

  tagsHtml += "</div>";
  return tagsHtml;
}

// Generate additional info display
function generateAdditionalInfo(image) {
  let infoHtml = "";

  if (image.budget_category && image.budget_category !== "unknown") {
    infoHtml += `<div class="metadata-item"><strong>Budget:</strong> ${image.budget_category}</div>`;
  }

  if (image.space_type && image.space_type !== "unknown") {
    infoHtml += `<div class="metadata-item"><strong>Space:</strong> ${image.space_type}</div>`;
  }

  if (
    image.tags &&
    image.tags.functionality &&
    image.tags.functionality !== "unknown"
  ) {
    infoHtml += `<div class="metadata-item"><strong>Function:</strong> ${image.tags.functionality}</div>`;
  }

  return infoHtml;
}

// Generate user-friendly image title
function generateImageTitle(image) {
  const roomType = image.room_type
    ? image.room_type
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "";

  const designTheme = image.design_theme
    ? image.design_theme
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "";

  if (roomType && designTheme) {
    return `${designTheme} ${roomType}`;
  } else if (roomType) {
    return `${roomType} Design`;
  } else if (designTheme) {
    return `${designTheme} Interior`;
  } else {
    return "Interior Design";
  }
}

// Open Image Modal (Simple implementation)
function openImageModal(imageUrl, imageId) {
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    cursor: pointer;
  `;

  modal.innerHTML = `
    <div style="max-width: 90%; max-height: 90%; position: relative;">
      <img 
        src="${imageUrl}" 
        alt="${imageId}"
        style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px;"
      >
      <div style="position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; font-size: 14px;">
        ${imageId}
      </div>
    </div>
  `;

  modal.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  document.body.appendChild(modal);
}

// Utility Functions
function setLoading(show) {
  isSearching = show;
  loading.style.display = show ? "block" : "none";
  searchBtn.disabled = show;
  status.style.display = show ? "none" : "block";
}

function setStatus(message) {
  status.textContent = message;
  status.style.display = "block";
}

function setError(message) {
  error.textContent = message;
  error.style.display = message ? "block" : "none";
}

// Create AI Insights Card
function createInsightsCard(insights) {
  const { query_analysis, result_analysis } = insights;
  
  let featuresHTML = '';
  if (query_analysis.detected_features) {
    featuresHTML = `<div class="insight-item"><strong>Features:</strong> ${query_analysis.detected_features}</div>`;
  }
  
  let roomTypesHTML = '';
  if (query_analysis.detected_room_types && query_analysis.detected_room_types.length > 0) {
    roomTypesHTML = `<div class="insight-item"><strong>Room Types:</strong> ${query_analysis.detected_room_types.join(', ')}</div>`;
  }
  
  let intentHTML = '';
  if (query_analysis.search_intent) {
    const intentLabels = {
      'style_preference': 'Style Preference',
      'budget_constraint': 'Budget Constraint',
      'feature_specific': 'Feature Specific',
      'general_search': 'General Search'
    };
    intentHTML = `<div class="insight-item"><strong>Search Intent:</strong> ${intentLabels[query_analysis.search_intent] || query_analysis.search_intent}</div>`;
  }
  
  let confidenceHTML = '';
  if (result_analysis.confidence_level) {
    const confidenceLabels = {
      'high': 'High Confidence',
      'medium': 'Medium Confidence',
      'low': 'Low Confidence'
    };
    confidenceHTML = `<div class="insight-item"><strong>Confidence:</strong> ${confidenceLabels[result_analysis.confidence_level] || result_analysis.confidence_level}</div>`;
  }
  
  return `
    <div class="ai-insights-card">
      <div class="insights-header">
        <h3>🤖 AI Search Insights</h3>
        <div class="ai-badge">AI-Powered</div>
      </div>
      <div class="insights-content">
        <div class="insights-section">
          <h4>Query Analysis</h4>
          ${featuresHTML}
          ${roomTypesHTML}
          ${intentHTML}
        </div>
        <div class="insights-section">
          <h4>Result Analysis</h4>
          <div class="insight-item"><strong>Total Results:</strong> ${result_analysis.total_results}</div>
          ${confidenceHTML}
        </div>
      </div>
    </div>
  `;
}

// Add global function for image modal
window.openImageModal = openImageModal;
