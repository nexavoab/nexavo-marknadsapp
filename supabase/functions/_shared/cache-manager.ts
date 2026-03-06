/**
 * Cache Manager for Edge Functions
 * Provides caching layer using app_cache table
 */

export class CacheManager {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Get cached data by key
   * Returns null if not found or expired
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from('app_cache')
        .select('value, expires_at')
        .eq('key', key)
        .single();

      if (error || !data) return null;

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        // Fire-and-forget delete of expired entry
        this.delete(key).catch(() => {});
        return null;
      }

      return data.value as T;
    } catch (err) {
      console.warn(`[Cache] Read error for ${key}:`, err);
      return null; // Fail safe: fetch fresh data if cache fails
    }
  }

  /**
   * Store data in cache
   * @param key - Cache key
   * @param value - Data to cache (will be stored as JSONB)
   * @param ttlSeconds - Time to live in seconds (default 24h = 86400)
   */
  async set(key: string, value: unknown, ttlSeconds: number = 86400): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      
      const { error } = await this.supabase
        .from('app_cache')
        .upsert({ 
          key, 
          value, 
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        });
        
      if (error) {
        console.warn(`[Cache] Write error for ${key}:`, error);
      }
    } catch (err) {
      console.warn(`[Cache] Write error for ${key}:`, err);
      // Don't throw - caching should not break the main flow
    }
  }

  /**
   * Delete a cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      await this.supabase.from('app_cache').delete().eq('key', key);
    } catch (err) {
      console.warn(`[Cache] Delete error for ${key}:`, err);
    }
  }

  /**
   * Delete all expired entries (cleanup job)
   */
  async cleanupExpired(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('app_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('key');
      
      if (error) {
        console.warn('[Cache] Cleanup error:', error);
        return 0;
      }
      
      return data?.length || 0;
    } catch (err) {
      console.warn('[Cache] Cleanup error:', err);
      return 0;
    }
  }
}

/**
 * Generate a hash key from an object (for caching based on input)
 */
export async function generateCacheKey(prefix: string, input: unknown): Promise<string> {
  const inputString = JSON.stringify(input);
  const msgUint8 = new TextEncoder().encode(inputString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}:${hashHex.substring(0, 16)}`; // Use first 16 chars for shorter keys
}

/**
 * Common TTL values (in seconds)
 */
export const CacheTTL = {
  SHORT: 3600,        // 1 hour
  MEDIUM: 86400,      // 24 hours
  LONG: 172800,       // 48 hours
  WEEK: 604800,       // 7 days
} as const;
