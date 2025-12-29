// File Storage Service for PostgreSQL
import { insertRecord, selectRecords, deleteRecord } from './api/postgresql-service';
import type { FileStorage } from '@/integrations/postgresql/types';
import { getApiRoot } from '@/config/api';

const STORAGE_BASE_PATH = import.meta.env.VITE_FILE_STORAGE_PATH || '/var/lib/buildflow/storage';

/**
 * Upload file to storage
 */
export async function uploadFile(
  bucket: string,
  filePath: string,
  fileContent: Buffer | ArrayBuffer | Uint8Array | { length: number },
  userId: string | null,
  mimeType: string = 'application/octet-stream'
): Promise<FileStorage> {
  // Get file size from various input types
  let fileSize: number;
  let buffer: Buffer;
  
  if (fileContent instanceof ArrayBuffer) {
    fileSize = fileContent.byteLength;
    buffer = Buffer.from(fileContent);
  } else if (fileContent instanceof Uint8Array) {
    fileSize = fileContent.length;
    buffer = Buffer.from(fileContent);
  } else if (fileContent instanceof Buffer) {
    fileSize = fileContent.length;
    buffer = fileContent;
  } else if (fileContent && typeof fileContent === 'object' && 'length' in fileContent) {
    fileSize = fileContent.length;
    buffer = Buffer.from(fileContent as any);
  } else {
    fileSize = 0;
    buffer = Buffer.alloc(0);
  }
  
  // Upload file to server via API
  const baseUrl = getApiRoot();
  const token = localStorage.getItem('auth_token') || '';
  
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  const fileName = filePath.split('/').pop() || 'file';
  formData.append('file', blob, fileName);
  formData.append('bucket', bucket);
  // Remove bucket prefix if present in filePath
  const cleanPath = filePath.startsWith(`${bucket}/`) 
    ? filePath.replace(`${bucket}/`, '') 
    : filePath;
  formData.append('path', cleanPath);
  
  const response = await fetch(`${baseUrl}/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(errorData.error?.message || errorData.message || 'Failed to upload file');
  }

  const result = await response.json();
  
  // Return the file_storage record from the API response with data property
  if (result.data?.file_storage) {
    return {
      ...result.data.file_storage,
      file_path: result.data.file_storage.file_path,
      data: result.data, // Include full response data for path access
    } as any;
  }
  
  // Fallback: Record metadata in database if API didn't return it
  // cleanPath is already declared above, reuse it
  const fileStorage = await insertRecord<FileStorage>('file_storage', {
    bucket_name: bucket,
    file_path: cleanPath,
    file_name: cleanPath.split('/').pop(),
    file_size: fileSize,
    mime_type: mimeType,
    uploaded_by: userId,
  });

  return {
    ...fileStorage,
    file_path: cleanPath,
    data: { path: `${bucket}/${cleanPath}` },
  } as any;
}

/**
 * Download file from storage
 */
export async function downloadFile(
  bucket: string,
  filePath: string
): Promise<Buffer> {
  // Fetch from API endpoint
  const baseUrl = getApiRoot();
  const token = localStorage.getItem('auth_token') || '';
  
  const encodedPath = encodeURIComponent(filePath);
  const response = await fetch(`${baseUrl}/files/${bucket}/${encodedPath}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(errorData.error?.message || errorData.message || `Failed to download file: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete file from storage
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<void> {
  // In a real implementation, this would:
  // 1. Delete file from disk/S3
  // 2. Remove metadata from database

  await deleteRecord('file_storage', {
    bucket_name: bucket,
    file_path: filePath,
  });
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
  bucket: string,
  filePath: string
): Promise<FileStorage | null> {
  // Placeholder - would query database
  return null;
}

/**
 * List files in bucket
 */
export async function listFiles(
  bucket: string,
  prefix?: string
): Promise<FileStorage[]> {
  // Placeholder - would query database
  return [];
}

/**
 * Get file URL (for serving files)
 */
export function getFileUrl(bucket: string, filePath: string): string {
  return `/api/files/${bucket}/${filePath}`;
}
