// Direct LangCache REST API implementation (more reliable than SDK)

interface LangCacheConfig {
  host: string;
  cacheId: string;
  apiKey: string;
}

function getConfig(): LangCacheConfig {
  const host = process.env.LANGCACHE_HOST;
  const cacheId = process.env.LANGCACHE_CACHE_ID;
  const apiKey = process.env.LANGCACHE_API_KEY;

  if (!host || !cacheId || !apiKey) {
    throw new Error(
      'LangCache environment variables not set. Required: LANGCACHE_HOST, LANGCACHE_CACHE_ID, LANGCACHE_API_KEY'
    );
  }

  return { host, cacheId, apiKey };
}

export async function checkCache(
  prompt: string,
  _context: string
): Promise<{ hit: boolean; response?: string; distance?: number; cachedPrompt?: string }> {
  console.log('[LangCache] Checking cache for prompt...');
  console.log(`[LangCache] Prompt: "${prompt.substring(0, 50)}..."`);

  try {
    const { host, cacheId, apiKey } = getConfig();
    const url = `${host}/v1/caches/${cacheId}/entries/search`;

    console.log(`[LangCache] Searching at: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LangCache] Search failed: ${response.status} - ${errorText}`);
      return { hit: false };
    }

    const result = await response.json();
    console.log('[LangCache] Search response:', JSON.stringify(result).substring(0, 300));

    // API returns { data: [{ response: "...", prompt: "...", distance: 0.xx }] }
    if (result?.data?.length > 0 && result.data[0].response) {
      const entry = result.data[0];
      const cachedResponse = entry.response;
      const distance = entry.distance ?? entry.score ?? null;
      const cachedPrompt = entry.prompt;

      console.log(`[LangCache] HIT! Distance: ${distance}, Cached prompt: "${cachedPrompt?.substring(0, 50)}..."`);
      return {
        hit: true,
        response: cachedResponse,
        distance,
        cachedPrompt,
      };
    }

    console.log('[LangCache] MISS - No cached entry found');
    return { hit: false };
  } catch (error) {
    console.error('[LangCache] Error checking cache:', error);
    return { hit: false };
  }
}

export async function storeInCache(
  prompt: string,
  response: string,
  _context: string
): Promise<void> {
  console.log('[LangCache] Storing response in cache...');

  try {
    const { host, cacheId, apiKey } = getConfig();
    const url = `${host}/v1/caches/${cacheId}/entries`;

    console.log(`[LangCache] Storing at: ${url}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        response,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[LangCache] Store failed: ${res.status} - ${errorText}`);
      return;
    }

    const result = await res.json();
    console.log(`[LangCache] Stored successfully:`, result);
  } catch (error) {
    console.error('[LangCache] Error storing in cache:', error);
  }
}

export async function getCacheStats(): Promise<{ enabled: boolean; host: string; cacheId: string }> {
  try {
    const { host, cacheId } = getConfig();
    return {
      enabled: true,
      host,
      cacheId,
    };
  } catch {
    return {
      enabled: false,
      host: '',
      cacheId: '',
    };
  }
}

export async function clearCache(): Promise<void> {
  console.log('[LangCache] Flushing cache...');

  try {
    const { host, cacheId, apiKey } = getConfig();
    const url = `${host}/v1/caches/${cacheId}/flush`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LangCache] Flush failed: ${response.status} - ${errorText}`);
      return;
    }

    console.log('[LangCache] Cache flushed successfully');
  } catch (error) {
    console.error('[LangCache] Error flushing cache:', error);
  }
}
