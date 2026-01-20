import { NextRequest } from 'next/server';
import { generateEmbedding, streamChatCompletion, ChatMessage } from '@/lib/embeddings';
import { searchSimilarChunks, createVectorIndex } from '@/lib/redis';
import { checkCache, storeInCache } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { getSettings } from '@/lib/settings';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json() as { messages: ChatMessage[] };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get current settings
    const settings = getSettings();

    // Ensure index exists
    await createVectorIndex();

    // Get the latest user message for retrieval
    const latestUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (!latestUserMessage) {
      return new Response(JSON.stringify({ error: 'No user message found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.system.info(`New query received`, { query: latestUserMessage.content });

    // Generate embedding for the query
    logger.retrieval.search(latestUserMessage.content);
    const queryEmbedding = await generateEmbedding(latestUserMessage.content);

    // Search for relevant documents using settings
    const allChunks = await searchSimilarChunks(queryEmbedding, settings.vectordb.topK);

    // Filter by score threshold
    const relevantChunks = allChunks.filter(
      (chunk) => chunk.score >= settings.vectordb.scoreThreshold
    );
    logger.retrieval.found(relevantChunks.length, {
      totalRetrieved: allChunks.length,
      topK: settings.vectordb.topK,
      scoreThreshold: settings.vectordb.scoreThreshold,
    });

    // Log each retrieved chunk
    relevantChunks.forEach((chunk) => {
      logger.retrieval.chunk(chunk.filename, chunk.score, chunk.content);
    });

    // Build context from retrieved chunks
    const context = relevantChunks.length > 0
      ? relevantChunks
          .map((chunk, i) => `[Source ${i + 1}: ${chunk.filename}]\n${chunk.content}`)
          .join('\n\n---\n\n')
      : 'No relevant documents found in the knowledge base.';

    // Check LangCache for cached response (if enabled)
    if (settings.langcache.enabled) {
      try {
        const cacheResult = await checkCache(latestUserMessage.content, context);
        if (cacheResult.hit && cacheResult.response) {
          logger.cache.hit(latestUserMessage.content, {
            responseLength: cacheResult.response.length,
          });
          // Return cached response as a simple text response (not streaming)
          return new Response(cacheResult.response, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'X-Cache': 'HIT',
            },
          });
        }
        logger.cache.miss(latestUserMessage.content);
      } catch (cacheError) {
        logger.cache.error('Cache check failed', { error: String(cacheError) });
      }
    } else {
      logger.cache.miss(latestUserMessage.content, { reason: 'Cache disabled' });
    }

    // Call LLM
    logger.llm.start(settings.llm.model, {
      contextLength: context.length,
      messageCount: messages.length,
      temperature: settings.llm.temperature,
      maxTokens: settings.llm.maxTokens,
    });

    // Create streaming response with cache storage
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChatCompletion(messages, context, settings.llm)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();

          logger.llm.complete(settings.llm.model, fullResponse.length);

          // Store in cache after streaming completes (if enabled)
          if (settings.langcache.enabled) {
            try {
              await storeInCache(latestUserMessage.content, fullResponse, context);
              logger.cache.store(latestUserMessage.content, {
                responseLength: fullResponse.length,
              });
            } catch (storeError) {
              logger.cache.error('Failed to store in cache', { error: String(storeError) });
            }
          }
        } catch (error) {
          logger.llm.error('Streaming failed', { error: String(error) });
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    logger.system.error('Chat API error', { error: String(error) });
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
