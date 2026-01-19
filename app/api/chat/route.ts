import { NextRequest } from 'next/server';
import { generateEmbedding, streamChatCompletion, ChatMessage } from '@/lib/embeddings';
import { searchSimilarChunks, createVectorIndex } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json() as { messages: ChatMessage[] };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(latestUserMessage.content);

    // Search for relevant documents
    const relevantChunks = await searchSimilarChunks(queryEmbedding, 5);

    // Build context from retrieved chunks
    const context = relevantChunks.length > 0
      ? relevantChunks
          .map((chunk, i) => `[Source ${i + 1}: ${chunk.filename}]\n${chunk.content}`)
          .join('\n\n---\n\n')
      : 'No relevant documents found in the knowledge base.';

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChatCompletion(messages, context)) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
