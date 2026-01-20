import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { listFilesInFolder, downloadFile } from '@/lib/gdrive';
import { parseDocument, chunkText } from '@/lib/documentLoader';
import { generateEmbeddings } from '@/lib/embeddings';
import { storeDocumentChunk, createVectorIndex } from '@/lib/redis';

export async function GET(request: NextRequest) {
  console.log('[API/gdrive] GET request received');

  try {
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get('folderId') || undefined;
    console.log(`[API/gdrive] Folder ID: ${folderId || 'using default from env'}`);

    const files = await listFilesInFolder(folderId);
    console.log(`[API/gdrive] Found ${files.length} files`);

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error('[API/gdrive] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to list Google Drive files', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[API/gdrive] POST request received - starting sync');

  try {
    const body = await request.json();
    const { folderId } = body as { folderId?: string };
    console.log(`[API/gdrive] Request body:`, body);

    // Ensure index exists
    console.log('[API/gdrive] Creating vector index if needed...');
    await createVectorIndex();

    // List files in the folder
    console.log('[API/gdrive] Listing files...');
    const files = await listFilesInFolder(folderId);
    console.log(`[API/gdrive] Found ${files.length} files to process`);

    if (files.length === 0) {
      console.log('[API/gdrive] No supported files found');
      return NextResponse.json({ message: 'No supported files found in folder', results: [] });
    }

    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n[API/gdrive] Processing file ${i + 1}/${files.length}: ${file.name}`);
      console.log(`[API/gdrive]   ID: ${file.id}`);
      console.log(`[API/gdrive]   MIME: ${file.mimeType}`);
      console.log(`[API/gdrive]   Size: ${file.size} bytes`);

      try {
        // Download file
        console.log(`[API/gdrive]   Downloading...`);
        const buffer = await downloadFile(file.id, file.mimeType);
        console.log(`[API/gdrive]   Downloaded ${buffer.length} bytes`);

        // Parse document
        console.log(`[API/gdrive]   Parsing document...`);
        const { text, filename } = await parseDocument(buffer, file.name, file.mimeType);
        console.log(`[API/gdrive]   Parsed ${text.length} characters`);

        // Chunk the text
        console.log(`[API/gdrive]   Chunking text...`);
        const chunks = chunkText(text);
        console.log(`[API/gdrive]   Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
          console.log(`[API/gdrive]   Skipping - no content`);
          results.push({ filename: file.name, status: 'skipped', reason: 'No content' });
          continue;
        }

        // Generate embeddings for all chunks
        console.log(`[API/gdrive]   Generating embeddings for ${chunks.length} chunks...`);
        const embeddings = await generateEmbeddings(chunks.map((c) => c.content));
        console.log(`[API/gdrive]   Generated ${embeddings.length} embeddings`);

        // Store chunks in Redis
        console.log(`[API/gdrive]   Storing in Redis...`);
        for (let j = 0; j < chunks.length; j++) {
          await storeDocumentChunk({
            id: uuidv4(),
            content: chunks[j].content,
            embedding: embeddings[j],
            metadata: {
              filename,
              chunkIndex: chunks[j].chunkIndex,
              totalChunks: chunks[j].totalChunks,
            },
          });
        }
        console.log(`[API/gdrive]   Stored ${chunks.length} chunks`);

        results.push({
          filename: file.name,
          status: 'success',
          chunks: chunks.length,
        });
        console.log(`[API/gdrive]   SUCCESS: ${file.name}`);
      } catch (fileError: any) {
        console.error(`[API/gdrive]   ERROR processing ${file.name}:`, fileError);
        results.push({
          filename: file.name,
          status: 'error',
          error: fileError.message || String(fileError),
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;
    console.log(`\n[API/gdrive] Sync complete: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      message: `Processed ${successCount} files`,
      results,
    });
  } catch (error: any) {
    console.error('[API/gdrive] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Google Drive files', details: error.message },
      { status: 500 }
    );
  }
}
