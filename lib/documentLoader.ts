import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export interface DocumentContent {
  text: string;
  filename: string;
}

export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<DocumentContent> {
  console.log(`[DocumentLoader] Parsing document: ${filename}`);
  console.log(`[DocumentLoader] MIME type: ${mimeType}`);
  console.log(`[DocumentLoader] Buffer size: ${buffer.length} bytes`);

  let text = '';

  try {
    switch (mimeType) {
      case 'application/pdf':
        console.log(`[DocumentLoader] Processing as PDF...`);
        const pdfData = await pdf(buffer);
        text = pdfData.text;
        console.log(`[DocumentLoader] PDF parsed successfully. Pages: ${pdfData.numpages}, Text length: ${text.length}`);
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        console.log(`[DocumentLoader] Processing as DOCX...`);
        const docxResult = await mammoth.extractRawText({ buffer });
        text = docxResult.value;
        console.log(`[DocumentLoader] DOCX parsed successfully. Text length: ${text.length}`);
        if (docxResult.messages.length > 0) {
          console.log(`[DocumentLoader] DOCX warnings:`, docxResult.messages);
        }
        break;

      case 'text/plain':
      case 'text/markdown':
      case 'application/vnd.google-apps.document':
        console.log(`[DocumentLoader] Processing as text...`);
        text = buffer.toString('utf-8');
        console.log(`[DocumentLoader] Text file parsed. Length: ${text.length}`);
        break;

      default:
        console.error(`[DocumentLoader] Unsupported MIME type: ${mimeType}`);
        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    console.log(`[DocumentLoader] Successfully parsed ${filename}. Extracted ${text.length} characters`);
    return { text, filename };
  } catch (error) {
    console.error(`[DocumentLoader] Error parsing ${filename}:`, error);
    throw error;
  }
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  totalChunks: number;
}

export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): TextChunk[] {
  console.log(`[DocumentLoader] Chunking text. Input length: ${text.length}, Chunk size: ${chunkSize}, Overlap: ${overlap}`);

  const chunks: TextChunk[] = [];

  // Clean the text
  const cleanedText = text
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanedText.length === 0) {
    console.log(`[DocumentLoader] No content after cleaning, returning empty chunks`);
    return [];
  }

  // Split into sentences for better chunking
  const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];
  console.log(`[DocumentLoader] Split into ${sentences.length} sentences`);

  let currentChunk = '';
  const allChunks: string[] = [];

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      allChunks.push(currentChunk.trim());

      // Keep overlap from the end of the current chunk
      const words = currentChunk.split(' ');
      const overlapWords = [];
      let overlapLength = 0;

      for (let i = words.length - 1; i >= 0 && overlapLength < overlap; i--) {
        overlapWords.unshift(words[i]);
        overlapLength += words[i].length + 1;
      }

      currentChunk = overlapWords.join(' ') + ' ' + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    allChunks.push(currentChunk.trim());
  }

  console.log(`[DocumentLoader] Created ${allChunks.length} chunks`);

  return allChunks.map((content, index) => ({
    content,
    chunkIndex: index,
    totalChunks: allChunks.length,
  }));
}
