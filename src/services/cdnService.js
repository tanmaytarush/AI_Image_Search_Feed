import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CDNService {
  constructor() {
    this.cacheDir = path.join(__dirname, "../../cache");
    this.analysisCacheDir = path.join(this.cacheDir, "analysis");
    this.imageCacheDir = path.join(this.cacheDir, "images");
    this.ensureCacheDirectories();
  }

  /**
   * Ensure cache directories exist
   */
  ensureCacheDirectories() {
    [this.cacheDir, this.analysisCacheDir, this.imageCacheDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate cache key for image URL
   */
  generateCacheKey(imageUrl) {
    return crypto.createHash('md5').update(imageUrl).digest('hex');
  }

  /**
   * Check if analysis result is cached
   */
  async getCachedAnalysis(imageUrl) {
    try {
      const cacheKey = this.generateCacheKey(imageUrl);
      const cacheFile = path.join(this.analysisCacheDir, `${cacheKey}.json`);
      
      if (fs.existsSync(cacheFile)) {
        const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        
        // Check if cache is still valid (24 hours)
        const cacheAge = Date.now() - cachedData.cached_at;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (cacheAge < maxAge) {
          console.log(`📦 Serving cached analysis for: ${imageUrl}`);
          return cachedData.analysis;
        } else {
          // Remove expired cache
          fs.unlinkSync(cacheFile);
          console.log(`🗑️ Removed expired cache for: ${imageUrl}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error reading cache:", error);
      return null;
    }
  }

  /**
   * Cache analysis result
   */
  async cacheAnalysis(imageUrl, analysisResult) {
    try {
      const cacheKey = this.generateCacheKey(imageUrl);
      const cacheFile = path.join(this.analysisCacheDir, `${cacheKey}.json`);
      
      const cacheData = {
        image_url: imageUrl,
        analysis: analysisResult,
        cached_at: Date.now(),
        cache_key: cacheKey
      };
      
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Cached analysis for: ${imageUrl}`);
      
      return true;
    } catch (error) {
      console.error("Error caching analysis:", error);
      return false;
    }
  }

  /**
   * Get CDN URL for image (simulate CDN transformation)
   */
  async getCDNUrl(originalUrl) {
    try {
      const cacheKey = this.generateCacheKey(originalUrl);
      const cdnUrl = await this.transformImageForCDN(originalUrl, cacheKey);
      return cdnUrl;
    } catch (error) {
      console.error("Error getting CDN URL:", error);
      return originalUrl; // Fallback to original URL
    }
  }

  /**
   * Transform image for CDN (simulate image optimization)
   */
  async transformImageForCDN(originalUrl, cacheKey) {
    // Check if we have a real CDN configured
    const cdnBaseUrl = process.env.CDN_BASE_URL;
    
    if (!cdnBaseUrl || cdnBaseUrl === "https://cdn.example.com") {
      // No real CDN configured, return original URL
      console.log(`🔄 No CDN configured, using original URL: ${originalUrl}`);
      return originalUrl;
    }
    
    // Real CDN transformation would happen here
    // For now, we'll simulate with a CDN URL pattern
    const optimizedUrl = `${cdnBaseUrl}/images/${cacheKey}/optimized.jpg`;
    
    console.log(`🔄 CDN transformation: ${originalUrl} -> ${optimizedUrl}`);
    
    return optimizedUrl;
  }

  /**
   * Check if image is already optimized in CDN
   */
  async isImageOptimized(imageUrl) {
    try {
      const cacheKey = this.generateCacheKey(imageUrl);
      const cdnUrl = await this.getCDNUrl(imageUrl);
      
      // In a real implementation, you would check if the CDN URL exists
      // For now, we'll simulate by checking if we have a cached analysis
      const cachedAnalysis = await this.getCachedAnalysis(imageUrl);
      return cachedAnalysis !== null;
    } catch (error) {
      console.error("Error checking CDN optimization:", error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    try {
      const analysisFiles = fs.readdirSync(this.analysisCacheDir);
      const imageFiles = fs.readdirSync(this.imageCacheDir);
      
      return {
        analysis_cache_count: analysisFiles.length,
        image_cache_count: imageFiles.length,
        cache_dir: this.cacheDir
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return { error: "Failed to get cache stats" };
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache() {
    try {
      const analysisFiles = fs.readdirSync(this.analysisCacheDir);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      let clearedCount = 0;
      
      for (const file of analysisFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.analysisCacheDir, file);
          const stats = fs.statSync(filePath);
          const age = Date.now() - stats.mtime.getTime();
          
          if (age > maxAge) {
            fs.unlinkSync(filePath);
            clearedCount++;
          }
        }
      }
      
      console.log(`🗑️ Cleared ${clearedCount} expired cache entries`);
      return clearedCount;
    } catch (error) {
      console.error("Error clearing expired cache:", error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache() {
    try {
      const analysisFiles = fs.readdirSync(this.analysisCacheDir);
      const imageFiles = fs.readdirSync(this.imageCacheDir);
      
      analysisFiles.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.analysisCacheDir, file));
        }
      });
      
      imageFiles.forEach(file => {
        fs.unlinkSync(path.join(this.imageCacheDir, file));
      });
      
      console.log(`🗑️ Cleared all cache (${analysisFiles.length} analysis, ${imageFiles.length} images)`);
      return { analysis: analysisFiles.length, images: imageFiles.length };
    } catch (error) {
      console.error("Error clearing all cache:", error);
      return { error: "Failed to clear cache" };
    }
  }
}

export default new CDNService(); 

