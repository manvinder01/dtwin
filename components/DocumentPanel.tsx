'use client';

import { useState, useRef } from 'react';

interface DocumentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentCount: number;
  onDocumentCountChange: () => void;
}

export function DocumentPanel({ isOpen, onClose, documentCount, onDocumentCountChange }: DocumentPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const successCount = data.results.filter((r: any) => r.status === 'success').length;
        setStatus({
          type: 'success',
          message: `Successfully processed ${successCount} file(s)`,
        });
        onDocumentCountChange();
      } else {
        setStatus({ type: 'error', message: data.error || 'Upload failed' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to upload files' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGoogleDriveSync = async () => {
    setIsSyncing(true);
    setStatus(null);

    try {
      const response = await fetch('/api/gdrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: data.message });
        onDocumentCountChange();
      } else {
        setStatus({ type: 'error', message: data.error || 'Sync failed' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to sync with Google Drive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete all documents? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setStatus(null);

    try {
      const response = await fetch('/api/ingest', { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'All documents deleted' });
        onDocumentCountChange();
      } else {
        setStatus({ type: 'error', message: data.error || 'Delete failed' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete documents' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Document Management</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{documentCount}</p>
            <p className="text-sm text-gray-500">Document chunks indexed</p>
          </div>

          {status && (
            <div
              className={`p-3 rounded-xl text-sm ${
                status.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {status.message}
            </div>
          )}

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 px-4 hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Files
                </>
              )}
            </button>

            <button
              onClick={handleGoogleDriveSync}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl py-3 px-4 hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
            >
              {isSyncing ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                  </svg>
                  Sync from Google Drive
                </>
              )}
            </button>

            <button
              onClick={handleDeleteAll}
              disabled={isDeleting || documentCount === 0}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-red-200 text-red-600 rounded-xl py-3 px-4 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 transition-colors"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete All Documents
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Supported formats: PDF, DOCX, TXT, MD
          </p>
        </div>
      </div>
    </div>
  );
}
