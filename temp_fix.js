// Replace hardcoded featureContext with dynamic generation
const fs = require('fs');
let content = fs.readFileSync('src/services/imageService.js', 'utf8');

// Replace hardcoded featureContext
content = content.replace(
  /const featureContext = \{[\s\S]*?\};/,
  'const featureContext = roomIntelligenceService.generateDynamicFeatureContext(queryLower);'
);

// Replace hardcoded featureKeywords
content = content.replace(
  /const featureKeywords = \[[\s\S]*?\];/,
  'const featureKeywords = roomIntelligenceService.generateDynamicFeatureKeywords(queryLower);'
);

fs.writeFileSync('src/services/imageService.js', content);
console.log('✅ Fixed hardcoded patterns in imageService.js');
