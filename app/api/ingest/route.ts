import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { parseDocument, chunkText } from '@/lib/documentLoader';
import { generateEmbeddings } from '@/lib/embeddings';
import { storeDocumentChunk, createVectorIndex, deleteAllDocuments, getDocumentCount } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Ensure index exists
    await createVectorIndex();

    const results = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || 'text/plain';

      // Parse document
      const { text, filename } = await parseDocument(buffer, file.name, mimeType);

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
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Ingest API error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing documents' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await deleteAllDocuments();
    return NextResponse.json({ success: true, message: 'All documents deleted' });
  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: 'An error occurred deleting documents' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await createVectorIndex();
    const count = await getDocumentCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Count API error:', error);
    return NextResponse.json(
      { error: 'An error occurred counting documents' },
      { status: 500 }
    );
  }
}
