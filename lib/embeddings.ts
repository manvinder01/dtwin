import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (openai) return openai;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  openai = new OpenAI({ apiKey });
  return openai;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();

  // Process in batches of 100 (OpenAI limit)
  const batchSize = 100;
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });

    embeddings.push(...response.data.map((d) => d.embedding));
  }

  return embeddings;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPromptTemplate: string;
  noDocsPromptTemplate: string;
}

const DEFAULT_LLM_SETTINGS: LLMSettings = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 2048,
  systemPromptTemplate: `You are a helpful assistant that answers questions STRICTLY based on the provided document context.

IMPORTANT RULES:
1. ONLY use information from the provided context below to answer questions
2. If the context doesn't fully answer the question, say "Based on the available documents, I can only tell you that..." and share what IS available
3. Do NOT supplement with outside knowledge - if it's not in the context, don't include it
4. Quote or reference specific sources when possible (e.g., "According to [Source 1]...")
5. If the context is only tangentially related, acknowledge this limitation

Context from retrieved documents:
{{context}}`,
  noDocsPromptTemplate: `You are a helpful assistant for a document-based Q&A system. The user asked a question but NO relevant documents were found in the knowledge base.

Your response MUST:
1. Clearly inform the user that no relevant information was found in the available documents
2. Suggest they try rephrasing their question or ask about topics that might be in the document collection
3. Do NOT answer the question using your general knowledge - only information from the documents should be used

Be concise and helpful in guiding them.`,
};

export async function* streamChatCompletion(
  messages: ChatMessage[],
  context: string,
  llmSettings?: Partial<LLMSettings>
): AsyncGenerator<string, void, unknown> {
  const client = getOpenAIClient();
  const settings = { ...DEFAULT_LLM_SETTINGS, ...llmSettings };

  const noContext = context === 'No relevant documents found in the knowledge base.';

  const systemPrompt = noContext
    ? settings.noDocsPromptTemplate
    : settings.systemPromptTemplate.replace('{{context}}', context);

  const response = await client.chat.completions.create({
    model: settings.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
    stream: true,
  });

  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
