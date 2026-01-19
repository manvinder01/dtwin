import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

let driveClient: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient;

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  const credentials = JSON.parse(serviceAccountKey);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

export async function listFilesInFolder(folderId?: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!targetFolderId) {
    throw new Error('No folder ID provided and GOOGLE_DRIVE_FOLDER_ID is not set');
  }

  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  const supportedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/vnd.google-apps.document', // Google Docs
  ];

  do {
    const response = await drive.files.list({
      q: `'${targetFolderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size)',
      pageSize: 100,
      pageToken,
    });

    const validFiles = (response.data.files || [])
      .filter((file) => file.mimeType && supportedMimeTypes.includes(file.mimeType))
      .map((file) => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: parseInt(file.size || '0', 10),
      }));

    files.push(...validFiles);
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return files;
}

export async function downloadFile(fileId: string, mimeType: string): Promise<Buffer> {
  const drive = getDriveClient();

  // Handle Google Docs by exporting as plain text
  if (mimeType === 'application/vnd.google-apps.document') {
    const response = await drive.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(response.data as ArrayBuffer);
  }

  // Download regular files
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = response.data as Readable;

    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
