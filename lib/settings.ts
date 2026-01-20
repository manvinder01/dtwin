// Global settings store (in-memory, resets on server restart)

export interface Settings {
  // VectorDB settings
  vectordb: {
    topK: number;           // Number of chunks to retrieve
    scoreThreshold: number; // Minimum similarity score (0-1)
  };

  // LangCache settings
  langcache: {
    enabled: boolean;
    similarityThreshold: number; // Threshold for semantic cache hit (0-1)
  };

  // LLM settings
  llm: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPromptTemplate: string;
    noDocsPromptTemplate: string;
  };
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant that answers questions STRICTLY based on the provided document context.

IMPORTANT RULES:
1. ONLY use information from the provided context below to answer questions
2. If the context doesn't fully answer the question, say "Based on the available documents, I can only tell you that..." and share what IS available
3. Do NOT supplement with outside knowledge - if it's not in the context, don't include it
4. Quote or reference specific sources when possible (e.g., "According to [Source 1]...")
5. If the context is only tangentially related, acknowledge this limitation

Context from retrieved documents:
{{context}}`;

const DEFAULT_NO_DOCS_PROMPT = `You are a helpful assistant for a document-based Q&A system. The user asked a question but NO relevant documents were found in the knowledge base.

Your response MUST:
1. Clearly inform the user that no relevant information was found in the available documents
2. Suggest they try rephrasing their question or ask about topics that might be in the document collection
3. Do NOT answer the question using your general knowledge - only information from the documents should be used

Be concise and helpful in guiding them.`;

export const defaultSettings: Settings = {
  vectordb: {
    topK: 5,
    scoreThreshold: 0.7,
  },
  langcache: {
    enabled: true,
    similarityThreshold: 0.95,
  },
  llm: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 2048,
    systemPromptTemplate: DEFAULT_SYSTEM_PROMPT,
    noDocsPromptTemplate: DEFAULT_NO_DOCS_PROMPT,
  },
};

// In-memory settings store
let currentSettings: Settings = { ...defaultSettings };

export function getSettings(): Settings {
  return currentSettings;
}

export function updateSettings(newSettings: Partial<Settings>): Settings {
  currentSettings = {
    ...currentSettings,
    vectordb: { ...currentSettings.vectordb, ...newSettings.vectordb },
    langcache: { ...currentSettings.langcache, ...newSettings.langcache },
    llm: { ...currentSettings.llm, ...newSettings.llm },
  };
  return currentSettings;
}

export function resetSettings(): Settings {
  currentSettings = { ...defaultSettings };
  return currentSettings;
}
