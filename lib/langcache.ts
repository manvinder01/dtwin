import { createClient, RedisClientType } from 'redis';
import { generateEmbedding } from './embeddings';

let cacheClient: RedisClientType | null = null;

const CACHE_INDEX_NAME = 'langcache_idx';
const CACHE_PREFIX = 'langcache:';
const DEFAULT_DISTANCE_THRESHOLD = 0.15; // Lower = more similar required
const DEFAULT_TTL = 3600; // 1 hour default TTL

export interface CacheEntry {
  id: string;
  prompt: string;
  response: string;
  embedding: number[];
  metadata?: Record<string, string>;
  timestamp: number;
}

export interface CacheConfig {
  distanceThreshold?: number;
  ttl?: number;
}

let config: CacheConfig = {
  distanceThreshold: DEFAULT_DISTANCE_THRESHOLD,
  ttl: DEFAULT_TTL,
};

async function getCacheClient(): Promise<RedisClientType> {
  if (cacheClient) return cacheClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  cacheClient = createClient({ url: redisUrl });
  cacheClient.on('error', (err) => console.error('[LangCache] Redis Client Error', err));
  await cacheClient.connect();

  return cacheClient;
}

export async function initLangCache(): Promise<void> {
  const redis = await getCacheClient();
  console.log('[LangCache] Initializing semantic cache index...');

  try {
    // Check if index exists
    await redis.ft.info(CACHE_INDEX_NAME);
    console.log('[LangCache] Cache index already exists');
  } catch {
    // Create index if it doesn't exist
    console.log('[LangCache] Creating new cache index...');
    await redis.ft.create(
      CACHE_INDEX_NAME,
      {
        '$.prompt': {
          type: 'TEXT',
          AS: 'prompt',
        },
        '$.response': {
          type: 'TEXT',
          AS: 'response',
        },
        '$.timestamp': {
          type: 'NUMERIC',
          AS: 'timestamp',
        },
        '$.embedding': {
          type: 'VECTOR',
          AS: 'embedding',
          ALGORITHM: 'HNSW',
          TYPE: 'FLOAT32',
          DIM: 1536,
          DISTANCE_METRIC: 'COSINE',
        },
      },
      {
        ON: 'JSON',
        PREFIX: CACHE_PREFIX,
      }
    );
    console.log('[LangCache] Cache index created successfully');
  }
}

export function setLangCacheConfig(newConfig: Partial<CacheConfig>): void {
  config = { ...config, ...newConfig };
  console.log('[LangCache] Config updated:', config);
}

export async function checkCache(
  prompt: string
): Promise<{ hit: boolean; response?: string; similarity?: number }> {
  console.log(`[LangCache] Checking cache for prompt: "${prompt.substring(0, 50)}..."`);

  try {
    await initLangCache();
    const redis = await getCacheClient();

    // Generate embedding for the prompt
    console.log('[LangCache] Generating embedding for prompt...');
    const queryEmbedding = await generateEmbedding(prompt);

    // Convert embedding to buffer for Redis vector search
    const embeddingBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);

    // Search for similar cached prompts
    const results = await redis.ft.search(
      CACHE_INDEX_NAME,
      `*=>[KNN 1 @embedding $vec AS distance]`,
      {
        PARAMS: { vec: embeddingBuffer },
        SORTBY: { BY: 'distance', DIRECTION: 'ASC' },
        RETURN: ['prompt', 'response', 'distance', 'timestamp'],
        DIALECT: 2,
      }
    );

    if (results.documents.length === 0) {
      console.log('[LangCache] Cache MISS - no entries found');
      return { hit: false };
    }

    const topResult = results.documents[0];
    const distance = parseFloat(topResult.value.distance as string);
    const cachedResponse = topResult.value.response as string;
    const cachedPrompt = topResult.value.prompt as string;

    console.log(`[LangCache] Found cached entry with distance: ${distance.toFixed(4)}`);
    console.log(`[LangCache] Cached prompt: "${cachedPrompt.substring(0, 50)}..."`);
    console.log(`[LangCache] Threshold: ${config.distanceThreshold}`);

    // Check if similarity is within threshold
    if (distance <= (config.distanceThreshold || DEFAULT_DISTANCE_THRESHOLD)) {
      console.log(`[LangCache] Cache HIT! Returning cached response`);
      return {
        hit: true,
        response: cachedResponse,
        similarity: 1 - distance, // Convert distance to similarity score
      };
    }

    console.log(`[LangCache] Cache MISS - distance ${distance.toFixed(4)} exceeds threshold`);
    return { hit: false };
  } catch (error) {
    console.error('[LangCache] Error checking cache:', error);
    return { hit: false };
  }
}

export async function storeInCache(
  prompt: string,
  response: string,
  metadata?: Record<string, string>
): Promise<void> {
  console.log(`[LangCache] Storing response in cache for prompt: "${prompt.substring(0, 50)}..."`);

  try {
    await initLangCache();
    const redis = await getCacheClient();

    // Generate embedding for the prompt
    const embedding = await generateEmbedding(prompt);

    // Create cache entry
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const key = `${CACHE_PREFIX}${id}`;

    const entry: CacheEntry = {
      id,
      prompt,
      response,
      embedding,
      metadata,
      timestamp: Date.now(),
    };

    // Store in Redis
    await redis.json.set(key, '$', entry as any);

    // Set TTL if configured
    if (config.ttl && config.ttl > 0) {
      await redis.expire(key, config.ttl);
      console.log(`[LangCache] Entry stored with TTL: ${config.ttl}s`);
    } else {
      console.log('[LangCache] Entry stored (no TTL)');
    }
  } catch (error) {
    console.error('[LangCache] Error storing in cache:', error);
  }
}

export async function clearCache(): Promise<number> {
  console.log('[LangCache] Clearing all cache entries...');

  try {
    const redis = await getCacheClient();
    const keys = await redis.keys(`${CACHE_PREFIX}*`);

    if (keys.length > 0) {
      await redis.del(keys);
      console.log(`[LangCache] Cleared ${keys.length} entries`);
      return keys.length;
    }

    console.log('[LangCache] Cache was already empty');
    return 0;
  } catch (error) {
    console.error('[LangCache] Error clearing cache:', error);
    return 0;
  }
}

export async function getCacheStats(): Promise<{
  totalEntries: number;
  indexInfo: any;
}> {
  try {
    const redis = await getCacheClient();
    const keys = await redis.keys(`${CACHE_PREFIX}*`);

    let indexInfo = null;
    try {
      indexInfo = await redis.ft.info(CACHE_INDEX_NAME);
    } catch {
      // Index doesn't exist yet
    }

    return {
      totalEntries: keys.length,
      indexInfo,
    };
  } catch (error) {
    console.error('[LangCache] Error getting cache stats:', error);
    return { totalEntries: 0, indexInfo: null };
  }
}
