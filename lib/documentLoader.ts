import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

const pdf = (pdfParse as any).default || pdfParse;

export interface DocumentContent {
  text: string;
  filename: string;
}

export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<DocumentContent> {
  let text = '';

  switch (mimeType) {
    case 'application/pdf':
      const pdfData = await pdf(buffer);
      text = pdfData.text;
      break;

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      const docxResult = await mammoth.extractRawText({ buffer });
      text = docxResult.value;
      break;

    case 'text/plain':
    case 'text/markdown':
    case 'application/vnd.google-apps.document':
      text = buffer.toString('utf-8');
      break;

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }

  return { text, filename };
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
  const chunks: TextChunk[] = [];

  // Clean the text
  const cleanedText = text
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanedText.length === 0) {
    return [];
  }

  // Split into sentences for better chunking
  const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];
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

  return allChunks.map((content, index) => ({
    content,
    chunkIndex: index,
    totalChunks: allChunks.length,
  }));
}
