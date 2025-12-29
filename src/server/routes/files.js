/**
 * File Serving Routes
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { getAgencyPool } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');

const STORAGE_BASE_PATH = process.env.FILE_STORAGE_PATH || path.join(__dirname, '../../storage');

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_BASE_PATH, { recursive: true });
    await fs.mkdir(path.join(STORAGE_BASE_PATH, 'documents'), { recursive: true });
  } catch (error) {
    console.warn('[Files] Could not create storage directory:', error.message);
  }
}
ensureStorageDir();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();

// File type validation
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    // Text
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Other
    'application/json',
    'application/xml',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: fileFilter,
});

/**
 * GET /api/files/:bucket/:path(*)
 * File serving endpoint - serves files from disk storage
 */
router.get('/:bucket/:path(*)', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  try {
    const { bucket, path: filePath } = req.params;
    const agencyDatabase = req.user.agencyDatabase;

    // Decode the path
    const decodedPath = decodeURIComponent(filePath);
    
    console.log(`[Files] Serving file - bucket: ${bucket}, path: ${decodedPath}`);
    
    // Construct full file path on disk
    // decodedPath might be just the filename or include subdirectories
    const fullPath = path.join(STORAGE_BASE_PATH, bucket, decodedPath);
    
    // Security: Ensure path is within storage directory (prevent directory traversal)
    const normalizedPath = path.normalize(fullPath);
    const storageBase = path.normalize(STORAGE_BASE_PATH);
    if (!normalizedPath.startsWith(storageBase)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`[Files] Attempting to serve file: ${normalizedPath}`);

    // Check if file exists
    let fileExists = false;
    try {
      await fs.access(normalizedPath);
      fileExists = true;
    } catch (accessError) {
      // File doesn't exist at expected path, try to find it
      console.log(`[Files] File not found at ${normalizedPath}, searching...`);
      
      // Try to find file by filename only (in case path structure differs)
      try {
        const bucketDir = path.join(STORAGE_BASE_PATH, bucket);
        const files = await fs.readdir(bucketDir, { recursive: true });
        const matchingFile = files.find((f) => f === decodedPath || f.endsWith(decodedPath));
        
        if (matchingFile) {
          const foundPath = path.join(bucketDir, matchingFile);
          const foundNormalized = path.normalize(foundPath);
          if (foundNormalized.startsWith(storageBase)) {
            // Use the found file
            const foundBuffer = await fs.readFile(foundNormalized);
            const agencyPool = getAgencyPool(agencyDatabase);
            const client = await agencyPool.connect();
            let mimeType = 'application/octet-stream';
            try {
              const docResult = await client.query(
                `SELECT file_type FROM public.documents 
                 WHERE file_path LIKE $1 OR file_path LIKE $2 LIMIT 1`,
                [`%${decodedPath}%`, `%${matchingFile}%`]
              );
              if (docResult.rows.length > 0) {
                mimeType = docResult.rows[0].file_type || mimeType;
              }
            } catch (dbError) {
              console.warn('[API] Could not get file metadata:', dbError.message);
            } finally {
              client.release();
            }
            
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${path.basename(decodedPath)}"`);
            res.setHeader('Content-Length', foundBuffer.length);
            return res.send(foundBuffer);
          }
        }
      } catch (searchError) {
        console.warn('[Files] Error searching for file:', searchError.message);
      }
      
      // File doesn't exist on disk, check if it exists in database
      const agencyPool = getAgencyPool(agencyDatabase);
      const client = await agencyPool.connect();
      try {
        // Try multiple path formats
        const docResult = await client.query(
          `SELECT file_path, file_type, file_size, name 
           FROM public.documents 
           WHERE file_path = $1 
              OR file_path = $2 
              OR file_path LIKE $3
              OR file_path LIKE $4
              OR file_path LIKE $5`,
          [
            `${bucket}/${decodedPath}`,  // Full path with bucket
            decodedPath,                  // Just the filename
            `%/${decodedPath}`,          // Any path ending with filename
            `%${decodedPath}%`,          // Contains filename
            `${bucket}/%${decodedPath}%` // Bucket path with filename
          ]
        );

        if (docResult.rows.length === 0) {
          return res.status(404).json({ error: 'File not found in database' });
        }

        // File exists in DB but not on disk - return metadata
        const doc = docResult.rows[0];
        console.warn(`[Files] File exists in DB but not on disk: ${doc.file_path}`);
        return res.status(404).json({
          error: 'File not found on disk',
          message: 'File metadata exists but file content is missing',
          file: {
            name: doc.name,
            type: doc.file_type,
            size: doc.file_size,
            db_path: doc.file_path,
          }
        });
      } finally {
        client.release();
      }
    }

    // Read file from disk
    const fileBuffer = await fs.readFile(normalizedPath);
    
    // Get file metadata from database for content type
    const agencyPool = getAgencyPool(agencyDatabase);
    const client = await agencyPool.connect();
    let mimeType = 'application/octet-stream';
    try {
      const docResult = await client.query(
        `SELECT file_type 
         FROM public.documents 
         WHERE file_path = $1 OR file_path LIKE $2 
         LIMIT 1`,
        [`${bucket}/${decodedPath}`, `%${decodedPath}`]
      );
      if (docResult.rows.length > 0) {
        mimeType = docResult.rows[0].file_type || mimeType;
      }
    } catch (dbError) {
      console.warn('[API] Could not get file metadata:', dbError.message);
    } finally {
      client.release();
    }

    // Set headers and send file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(decodedPath)}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    console.error('[API] File serving error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * POST /api/files/upload
 * Upload file to storage
 */
router.post('/upload', authenticate, requireAgencyContext, upload.single('file'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' },
        message: 'No file uploaded',
      });
    }

    const { bucket, path: filePath } = req.body;
    if (!bucket || !filePath) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'bucket and path are required' },
        message: 'Bucket and path are required',
      });
    }

    const agencyDatabase = req.user.agencyDatabase;
    const userId = req.user.id;

    // Ensure bucket directory exists
    const bucketDir = path.join(STORAGE_BASE_PATH, bucket);
    await fs.mkdir(bucketDir, { recursive: true });

    // Construct full file path (filePath might already include bucket, so handle both cases)
    let actualFilePath = filePath;
    if (filePath.startsWith(`${bucket}/`)) {
      actualFilePath = filePath.replace(`${bucket}/`, '');
    }
    
    const fullPath = path.join(bucketDir, actualFilePath);
    
    // Security: Ensure path is within storage directory
    const normalizedPath = path.normalize(fullPath);
    const storageBase = path.normalize(STORAGE_BASE_PATH);
    if (!normalizedPath.startsWith(storageBase)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(normalizedPath), { recursive: true });

    // Write file to disk
    await fs.writeFile(normalizedPath, req.file.buffer);
    
    console.log(`[Files] ✅ File saved to: ${normalizedPath}`);

    // Save metadata to file_storage table
    const agencyPool = getAgencyPool(agencyDatabase);
    const client = await agencyPool.connect();
    try {
      // Use actualFilePath (without bucket prefix) for storage
      const result = await client.query(
        `INSERT INTO public.file_storage (
          id, bucket_name, file_path, file_name, file_size, mime_type, uploaded_by, created_at
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT DO NOTHING
        RETURNING *`,
        [
          bucket,
          actualFilePath, // Store path without bucket prefix
          path.basename(actualFilePath),
          req.file.size,
          req.file.mimetype,
          userId,
        ]
      );
      
      // If no row returned (conflict), try to get existing record
      let fileStorageRecord = result.rows[0];
      if (!fileStorageRecord) {
        const existingResult = await client.query(
          `SELECT * FROM public.file_storage 
           WHERE bucket_name = $1 AND file_path = $2 
           LIMIT 1`,
          [bucket, actualFilePath]
        );
        fileStorageRecord = existingResult.rows[0];
      }

      res.json({
        success: true,
        data: {
          path: `${bucket}/${actualFilePath}`, // Return full path for documents table
          file_storage: fileStorageRecord,
        },
        message: 'File uploaded successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[API] File upload error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPLOAD_FAILED', message: error.message },
      message: error.message,
    });
  }
}));

module.exports = router;
