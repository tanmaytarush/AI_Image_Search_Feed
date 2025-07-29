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


  async transformImageForCDN(originalUrl, cacheKey) {
    const cdnBaseUrl = process.env.CDN_BASE_URL;
    const cdnProvider = process.env.CDN_PROVIDER || 'custom';
    
    // Use custom CDN transformation for your S3 URLs
    if (cdnProvider.toLowerCase() === 'custom' || cdnProvider.toLowerCase() === 'letsmultiply') {
      return this.convertToCDN(originalUrl);
    }
    
    if (!cdnBaseUrl || cdnBaseUrl === "https://cdn.example.com" || cdnBaseUrl === "https://your-cdn-provider.com") {
      console.log(`🔄 No CDN configured, using original URL: ${originalUrl}`);
      return originalUrl;
    }
    
    // Generate CDN URL based on provider with HF optimization parameters
    let optimizedUrl;
    
    switch (cdnProvider.toLowerCase()) {
      case 'cloudflare':
        // Cloudflare Images with HF optimization
        optimizedUrl = `${cdnBaseUrl}/images/${cacheKey}?width=800&height=600&fit=cover&format=auto&quality=85`;
        break;
      case 'aws':
        // AWS CloudFront with Lambda@Edge optimization
        optimizedUrl = `${cdnBaseUrl}/images/${cacheKey}/hf-optimized.jpg`;
        break;
      case 'cloudinary':
        // Cloudinary with HF-specific optimization
        optimizedUrl = `${cdnBaseUrl}/image/upload/f_auto,q_auto,w_800,h_600,c_fill/${cacheKey}`;
        break;
      case 'imgix':
        // Imgix with HF optimization
        optimizedUrl = `${cdnBaseUrl}/${cacheKey}?auto=format&fit=max&w=800&h=600&q=85`;
        break;
      case 'local':
        // Local image optimization (for development)
        optimizedUrl = await this.optimizeImageLocally(originalUrl, cacheKey);
        break;
      default:
        // Custom CDN with HF optimization
        optimizedUrl = `${cdnBaseUrl}/images/${cacheKey}?width=800&height=600&quality=85&format=auto`;
    }
    
    console.log(`🔄 CDN transformation (${cdnProvider}) for HF optimization: ${originalUrl} -> ${optimizedUrl}`);
    
    return optimizedUrl;
  }

  /**
   * Convert S3 URL to CDN URL for HF optimization
   */
  convertToCDN(s3Url) {
    // Check if s3Url is valid
    if (!s3Url || typeof s3Url !== 'string') {
      return s3Url; // Return original if invalid
    }
    
    const cdnBase = 'https://cdn.letsmultiply.co.in/cdn-cgi/image/width=100,quality=75,format=webp/digital-profiles/';
    
    // Extract the part after 'digital-profiles/'
    const regex = /digital-profiles\/(.+)$/;
    const match = s3Url.match(regex);
    
    if (match && match[1]) {
      const optimizedUrl = cdnBase + match[1];
      console.log(`🔄 Custom CDN transformation: ${s3Url} -> ${optimizedUrl}`);
      return optimizedUrl;
    }
    
    // If pattern doesn't match, return original URL
    console.log(`🔄 No CDN pattern match, using original URL: ${s3Url}`);
    return s3Url;
  }

  async optimizeImageLocally(originalUrl, cacheKey) {
    try {

      console.log(`🖼️ Local optimization simulated for: ${originalUrl}`);
      
      // Return a simulated optimized URL
      const optimizedUrl = `https://local-cdn.example.com/optimized/${cacheKey}.jpg`;
      
      console.log(`✅ Local optimization: ${originalUrl} -> ${optimizedUrl}`);
      return optimizedUrl;
    } catch (error) {
      console.error("Error in local image optimization:", error);
      return originalUrl; // Fallback to original
    }
  }

  async isImageOptimized(imageUrl) {
    try {
      const cacheKey = this.generateCacheKey(imageUrl);
      const cdnUrl = await this.getCDNUrl(imageUrl);

      const cachedAnalysis = await this.getCachedAnalysis(imageUrl);
      return cachedAnalysis !== null;
    } catch (error) {
      console.error("Error checking CDN optimization:", error);
      return false;
    }
  }

  getCDNConfig() {
    const cdnBaseUrl = process.env.CDN_BASE_URL;
    const cdnProvider = process.env.CDN_PROVIDER || 'custom';
    
    return {
      configured: !!(cdnBaseUrl && cdnBaseUrl !== "https://cdn.example.com" && cdnBaseUrl !== "https://your-cdn-provider.com"),
      base_url: cdnBaseUrl,
      provider: cdnProvider,
      status: cdnBaseUrl ? 'active' : 'not_configured'
    };
  }


  getCacheStats() {
    try {
      const analysisFiles = fs.readdirSync(this.analysisCacheDir);
      const imageFiles = fs.readdirSync(this.imageCacheDir);
      
      return {
        analysis_cache_count: analysisFiles.length,
        image_cache_count: imageFiles.length,
        cache_dir: this.cacheDir,
        cdn_config: this.getCDNConfig()
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return { error: "Failed to get cache stats" };
    }
  }

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

