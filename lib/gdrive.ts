import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

let driveClient: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive {
  if (driveClient) {
    console.log('[GDrive] Using cached Drive client');
    return driveClient;
  }

  console.log('[GDrive] Creating new Drive client...');
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.error('[GDrive] GOOGLE_SERVICE_ACCOUNT_KEY not set');
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  try {
    const credentials = JSON.parse(serviceAccountKey);
    console.log(`[GDrive] Service account email: ${credentials.client_email}`);
    console.log(`[GDrive] Project ID: ${credentials.project_id}`);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    driveClient = google.drive({ version: 'v3', auth });
    console.log('[GDrive] Drive client created successfully');
    return driveClient;
  } catch (error) {
    console.error('[GDrive] Failed to parse service account key:', error);
    throw error;
  }
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
    console.error('[GDrive] No folder ID provided');
    throw new Error('No folder ID provided and GOOGLE_DRIVE_FOLDER_ID is not set');
  }

  console.log(`[GDrive] Listing files in folder: ${targetFolderId}`);

  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  const supportedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/vnd.google-apps.document', // Google Docs
  ];

  try {
    do {
      console.log(`[GDrive] Fetching page of files...`);
      const response = await drive.files.list({
        q: `'${targetFolderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, size)',
        pageSize: 100,
        pageToken,
      });

      const allFiles = response.data.files || [];
      console.log(`[GDrive] Found ${allFiles.length} total files in this page`);

      // Log all files for debugging
      allFiles.forEach((file, i) => {
        console.log(`[GDrive]   ${i + 1}. ${file.name} (${file.mimeType}) - ${file.size || 'N/A'} bytes`);
      });

      const validFiles = allFiles
        .filter((file) => file.mimeType && supportedMimeTypes.includes(file.mimeType))
        .map((file) => ({
          id: file.id!,
          name: file.name!,
          mimeType: file.mimeType!,
          size: parseInt(file.size || '0', 10),
        }));

      console.log(`[GDrive] ${validFiles.length} files match supported MIME types`);

      files.push(...validFiles);
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    console.log(`[GDrive] Total supported files found: ${files.length}`);
    return files;
  } catch (error: any) {
    console.error('[GDrive] Error listing files:', error);
    if (error.code === 404) {
      console.error('[GDrive] Folder not found. Make sure the folder is shared with the service account.');
    } else if (error.code === 403) {
      console.error('[GDrive] Access denied. Make sure the folder is shared with the service account email.');
    }
    throw error;
  }
}

export async function downloadFile(fileId: string, mimeType: string): Promise<Buffer> {
  const drive = getDriveClient();
  console.log(`[GDrive] Downloading file: ${fileId} (${mimeType})`);

  try {
    // Handle Google Docs by exporting as plain text
    if (mimeType === 'application/vnd.google-apps.document') {
      console.log('[GDrive] Exporting Google Doc as plain text...');
      const response = await drive.files.export(
        { fileId, mimeType: 'text/plain' },
        { responseType: 'arraybuffer' }
      );
      const buffer = Buffer.from(response.data as ArrayBuffer);
      console.log(`[GDrive] Google Doc exported successfully. Size: ${buffer.length} bytes`);
      return buffer;
    }

    // Download regular files
    console.log('[GDrive] Downloading binary file...');
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = response.data as Readable;

      stream.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`[GDrive] File downloaded successfully. Size: ${buffer.length} bytes`);
        resolve(buffer);
      });

      stream.on('error', (error) => {
        console.error(`[GDrive] Error downloading file:`, error);
        reject(error);
      });
    });
  } catch (error: any) {
    console.error(`[GDrive] Download failed for file ${fileId}:`, error);
    if (error.code === 404) {
      console.error('[GDrive] File not found');
    } else if (error.code === 403) {
      console.error('[GDrive] Access denied to file');
    }
    throw error;
  }
}
