# DriveBot

A simple RAG (Retrieval-Augmented Generation) chatbot for Google Drive. Ask questions about your documents and get AI-powered answers based on the content.

![DriveBot](public/icon.svg)

## Features

- **Google Drive Integration**: Sync documents directly from your Google Drive folder
- **Multi-format Support**: PDF, DOCX, TXT, and Markdown files
- **Vector Search**: Redis Cloud with RediSearch for fast semantic search
- **Semantic Caching**: Redis LangCache to save tokens on repeated queries
- **Configurable Settings**: Adjust VectorDB, LangCache, and LLM hyperparameters via UI
- **Real-time Logs**: View cache hits/misses, retrieved chunks, and LLM calls
- **Streaming Responses**: Real-time streaming from GPT-4

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js UI    │────▶│   API Routes    │────▶│  Redis Cloud    │
│  (Chat Interface)│     │  (RAG Pipeline) │     │  (Vector Store) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
            ┌─────────────┐       ┌─────────────┐
            │  OpenAI API │       │ Google Drive│
            │   (GPT-4)   │       │     API     │
            └─────────────┘       └─────────────┘
```

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/manvinder01/dtwin.git
   cd dtwin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment example and configure:
   ```bash
   cp .env.local.example .env.local
   ```

4. Configure your environment variables (see [Configuration](#configuration))

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Configuration

### Environment Variables

Create a `.env.local` file with the following:

```env
# Redis Cloud connection string
REDIS_URL=redis://default:password@host:port

# OpenAI API key
OPENAI_API_KEY=sk-your-api-key

# Google Service Account credentials (JSON string)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Google Drive folder ID to sync documents from
GOOGLE_DRIVE_FOLDER_ID=your-folder-id

# Redis LangCache settings (optional, for semantic caching)
LANGCACHE_HOST=https://your-langcache-endpoint.redis.cloud
LANGCACHE_CACHE_ID=your-cache-id
LANGCACHE_API_KEY=your-api-key
```

### Google Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **Service Account**
6. Fill in the service account details and click **Create**
7. Skip the optional steps and click **Done**
8. Click on the created service account
9. Go to **Keys** tab → **Add Key** → **Create new key** → **JSON**
10. Download the JSON file
11. Copy the entire JSON content into `GOOGLE_SERVICE_ACCOUNT_KEY`

### Share Google Drive Folder

1. Open your Google Drive folder
2. Click **Share**
3. Add the service account email (found in the JSON key as `client_email`)
4. Give it **Viewer** access
5. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/[FOLDER_ID]`

### Redis Cloud Setup

1. Create a free account at [Redis Cloud](https://redis.com/try-free/)
2. Create a new database with the **RediSearch** module enabled
3. Copy the connection string to `REDIS_URL`

### LangCache Setup (Optional)

LangCache provides semantic caching to save tokens on similar queries:

1. Set up LangCache in your Redis Cloud account
2. Create a cache and note the Cache ID
3. Generate an API key
4. Configure `LANGCACHE_HOST`, `LANGCACHE_CACHE_ID`, and `LANGCACHE_API_KEY`

## Usage

### Syncing Documents

1. Click the **Documents** button in the header
2. Click **Sync from Google Drive** to fetch documents from your configured folder
3. Documents are automatically chunked and indexed

### Chatting

Simply type your question in the chat input. The chatbot will:
1. Search for relevant document chunks using vector similarity
2. Check the semantic cache for similar previous queries
3. Generate a response using GPT-4 with the retrieved context

### Viewing Logs

Click **Logs** to see detailed information about:
- Cache hits/misses
- Retrieved document chunks with similarity scores
- LLM invocations

### Adjusting Settings

Click the **Settings** (gear) icon to configure:
- **Vector DB**: Top K results, similarity score threshold
- **LangCache**: Enable/disable, similarity threshold
- **LLM**: Model, temperature, max tokens, system prompts

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Redis Cloud with RediSearch
- **Embeddings**: OpenAI text-embedding-3-small
- **LLM**: OpenAI GPT-4 Turbo
- **Caching**: Redis LangCache
- **Document Parsing**: pdf-parse, mammoth

## License

MIT
