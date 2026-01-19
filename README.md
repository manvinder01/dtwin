# RAG Chatbot

A visually appealing chatbot UI that performs Retrieval Augmented Generation (RAG) using Redis Cloud for vector storage and Google Drive for document ingestion.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Redis](https://img.shields.io/badge/Redis-Cloud-red)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-green)

## Features

- **Modern Chat UI** - Clean, responsive interface with streaming responses
- **Document Ingestion** - Upload PDFs, Word docs, text files, and markdown
- **Google Drive Sync** - Automatically sync documents from a Google Drive folder
- **Vector Search** - Fast similarity search using Redis Cloud with HNSW algorithm
- **Streaming Responses** - Real-time token streaming from GPT-4

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Vector Database**: Redis Cloud with RediSearch
- **LLM**: OpenAI GPT-4 Turbo
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Document Parsing**: pdf-parse, mammoth

## Getting Started

### Prerequisites

- Node.js 18+
- Redis Cloud account ([free tier available](https://redis.com/try-free/))
- OpenAI API key
- Google Cloud service account (for Google Drive integration)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/manvinder01/dtwin.git
   cd dtwin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` from the example:
   ```bash
   cp .env.local.example .env.local
   ```

4. Configure environment variables in `.env.local`:
   ```
   REDIS_URL=redis://default:password@host:port
   OPENAI_API_KEY=sk-your-api-key
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   GOOGLE_DRIVE_FOLDER_ID=your-folder-id
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Configuration

### Redis Cloud Setup

1. Create a free Redis Cloud database at [redis.com](https://redis.com/try-free/)
2. Enable the **RediSearch** module
3. Copy the connection string to `REDIS_URL`

### Google Drive Setup

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top and select **New Project**
3. Enter a project name (e.g., "RAG Chatbot") and click **Create**

#### Step 2: Enable the Google Drive API

1. In your project, go to **APIs & Services > Library**
2. Search for "Google Drive API"
3. Click on it and then click **Enable**

#### Step 3: Create a Service Account

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Enter a name (e.g., "drive-reader") and click **Create and Continue**
4. Skip the optional steps and click **Done**

#### Step 4: Generate the JSON Key

1. In the Credentials page, click on your newly created service account
2. Go to the **Keys** tab
3. Click **Add Key > Create new key**
4. Select **JSON** and click **Create**
5. A JSON file will be downloaded - keep this safe!

#### Step 5: Format the Key for .env.local

The JSON key needs to be on a single line. You can do this by:

```bash
# On Mac/Linux, run this in terminal:
cat path/to/downloaded-key.json | jq -c
```

Or manually remove all newlines from the JSON. Your `.env.local` should look like:

```
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"drive-reader@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

#### Step 6: Share Your Google Drive Folder

1. Find the `client_email` in your JSON key (looks like `name@project-id.iam.gserviceaccount.com`)
2. Go to Google Drive and right-click your folder
3. Click **Share** and paste the service account email
4. Give it **Viewer** access and click **Send**

#### Step 7: Get the Folder ID

1. Open your Google Drive folder in a browser
2. The URL will look like: `https://drive.google.com/drive/folders/1ABC123xyz...`
3. Copy the part after `/folders/` - that's your `GOOGLE_DRIVE_FOLDER_ID`

## Usage

### Uploading Documents

1. Click the **Documents** button in the header
2. Either:
   - Click **Upload Files** to upload local documents
   - Click **Sync from Google Drive** to import from your configured folder

### Chatting

Simply type your question in the input box and press Enter. The chatbot will:
1. Convert your question to an embedding
2. Search for relevant document chunks in Redis
3. Send the context + question to GPT-4
4. Stream the response back to you

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send chat messages, returns streaming response |
| `/api/ingest` | POST | Upload and ingest documents |
| `/api/ingest` | GET | Get document chunk count |
| `/api/ingest` | DELETE | Delete all documents |
| `/api/gdrive` | GET | List files in Google Drive folder |
| `/api/gdrive` | POST | Sync documents from Google Drive |

## Project Structure

```
dtwin/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # RAG chat endpoint
│   │   ├── gdrive/route.ts     # Google Drive sync
│   │   └── ingest/route.ts     # Document upload
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ChatInput.tsx
│   ├── ChatWindow.tsx
│   └── DocumentPanel.tsx
├── lib/
│   ├── documentLoader.ts       # PDF, DOCX, TXT parsing
│   ├── embeddings.ts           # OpenAI embeddings & chat
│   ├── gdrive.ts               # Google Drive client
│   └── redis.ts                # Redis vector operations
└── ...
```

## License

MIT
