import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { listFilesInFolder, downloadFile } from '@/lib/gdrive';
import { parseDocument, chunkText } from '@/lib/documentLoader';
import { generateEmbeddings } from '@/lib/embeddings';
import { storeDocumentChunk, createVectorIndex } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get('folderId') || undefined;

    const files = await listFilesInFolder(folderId);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Google Drive list error:', error);
    return NextResponse.json(
      { error: 'Failed to list Google Drive files' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { folderId } = await request.json() as { folderId?: string };

    // Ensure index exists
    await createVectorIndex();

    // List files in the folder
    const files = await listFilesInFolder(folderId);

    if (files.length === 0) {
      return NextResponse.json({ message: 'No supported files found in folder', results: [] });
    }

    const results = [];

    for (const file of files) {
      try {
        // Download file
        const buffer = await downloadFile(file.id, file.mimeType);

        // Parse document
        const { text, filename } = await parseDocument(buffer, file.name, file.mimeType);

        // Chunk the text
        const chunks = chunkText(text);

        if (chunks.length === 0) {
          results.push({ filename: file.name, status: 'skipped', reason: 'No content' });
          continue;
        }

        // Generate embeddings for all chunks
        const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

        // Store chunks in Redis
        for (let i = 0; i < chunks.length; i++) {
          await storeDocumentChunk({
            id: uuidv4(),
            content: chunks[i].content,
            embedding: embeddings[i],
            metadata: {
              filename,
              chunkIndex: chunks[i].chunkIndex,
              totalChunks: chunks[i].totalChunks,
            },
          });
        }

        results.push({
          filename: file.name,
          status: 'success',
          chunks: chunks.length,
        });
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        results.push({
          filename: file.name,
          status: 'error',
          error: String(fileError),
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.filter((r) => r.status === 'success').length} files`,
      results,
    });
  } catch (error) {
    console.error('Google Drive sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Google Drive files' },
      { status: 500 }
    );
  }
}
