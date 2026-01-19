import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  client = createClient({ url: redisUrl });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();

  return client;
}

// Vector index schema name
const INDEX_NAME = 'doc_embeddings_idx';
const DOC_PREFIX = 'doc:';

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    filename: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

export async function createVectorIndex(): Promise<void> {
  const redis = await getRedisClient();

  try {
    // Check if index exists
    await redis.ft.info(INDEX_NAME);
    console.log('Vector index already exists');
  } catch {
    // Create index if it doesn't exist
    await redis.ft.create(
      INDEX_NAME,
      {
        '$.content': {
          type: 'TEXT',
          AS: 'content',
        },
        '$.metadata.filename': {
          type: 'TEXT',
          AS: 'filename',
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
        PREFIX: DOC_PREFIX,
      }
    );
    console.log('Vector index created successfully');
  }
}

export async function storeDocumentChunk(chunk: DocumentChunk): Promise<void> {
  const redis = await getRedisClient();
  const key = `${DOC_PREFIX}${chunk.id}`;

  await redis.json.set(key, '$', {
    content: chunk.content,
    embedding: chunk.embedding,
    metadata: chunk.metadata,
  });
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  topK: number = 5
): Promise<Array<{ content: string; filename: string; score: number }>> {
  const redis = await getRedisClient();

  // Convert embedding to buffer for Redis vector search
  const embeddingBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);

  const results = await redis.ft.search(INDEX_NAME, `*=>[KNN ${topK} @embedding $vec AS score]`, {
    PARAMS: { vec: embeddingBuffer },
    SORTBY: { BY: 'score', DIRECTION: 'ASC' },
    RETURN: ['content', 'filename', 'score'],
    DIALECT: 2,
  });

  return results.documents.map((doc) => ({
    content: doc.value.content as string,
    filename: doc.value.filename as string,
    score: parseFloat(doc.value.score as string),
  }));
}

export async function deleteAllDocuments(): Promise<void> {
  const redis = await getRedisClient();
  const keys = await redis.keys(`${DOC_PREFIX}*`);
  if (keys.length > 0) {
    await redis.del(keys);
  }
}

export async function getDocumentCount(): Promise<number> {
  const redis = await getRedisClient();
  const keys = await redis.keys(`${DOC_PREFIX}*`);
  return keys.length;
}
