import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { config } from '../../config';
import { ValidationUtil } from '../../utils/validation';
import { AppError } from '../../types';

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    switch (file.fieldname) {
      case 'profileImage':
        uploadPath += 'profile-images/';
        break;
      case 'qrImage':
        uploadPath += 'qr-codes/';
        break;
      case 'document':
      case 'attachment':
        uploadPath += 'documents/';
        break;
      default:
        uploadPath += 'misc/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type based on field name
  if (file.fieldname === 'profileImage' || file.fieldname === 'qrImage') {
    // Image files only
    if (!ValidationUtil.validateFileType(file.mimetype, config.upload.allowedImageTypes)) {
      return cb(new AppError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400));
    }
  } else if (file.fieldname === 'document' || file.fieldname === 'attachment') {
    // Documents - allow images and PDFs
    const allowedTypes = [
      ...config.upload.allowedImageTypes,
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (!ValidationUtil.validateFileType(file.mimetype, allowedTypes)) {
      return cb(new AppError('Invalid file type. Only images, PDFs, and Word documents are allowed.', 400));
    }
  }

  // Check file size
  if (!ValidationUtil.validateFileSize(file.size || 0, config.upload.maxFileSize)) {
    return cb(new AppError(`File too large. Maximum size allowed is ${config.upload.maxFileSize} bytes.`, 400));
  }

  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 5, // Maximum 5 files per request
  },
});

// Middleware functions
export const uploadSingle = (fieldName: string) => {
  return upload.single(fieldName);
};

export const uploadMultiple = (fieldName: string, maxCount: number = 5) => {
  return upload.array(fieldName, maxCount);
};

export const uploadFields = (fields: { name: string; maxCount: number }[]) => {
  return upload.fields(fields);
};

// Profile image upload (single file)
export const uploadProfileImage = uploadSingle('profileImage');

// QR code image upload (single file)
export const uploadQRImage = uploadSingle('qrImage');

// Document upload (multiple files)
export const uploadDocuments = uploadMultiple('document', 5);

// Support ticket attachments
export const uploadAttachments = uploadMultiple('attachment', 3);

// Mixed file upload for complex forms
export const uploadMixed = uploadFields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'document', maxCount: 3 },
]);

// Helper function to get file URL
export const getFileUrl = (filename: string, type: 'profile' | 'qr' | 'document' = 'document'): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  let folder = '';
  
  switch (type) {
    case 'profile':
      folder = 'profile-images';
      break;
    case 'qr':
      folder = 'qr-codes';
      break;
    case 'document':
      folder = 'documents';
      break;
  }
  
  return `${baseUrl}/uploads/${folder}/${filename}`;
};

// Error handling middleware for multer
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          error: 'File too large',
          message: `Maximum file size allowed is ${config.upload.maxFileSize} bytes`,
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files',
          message: 'Maximum 5 files allowed per request',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field',
          message: 'Invalid file field name',
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'File upload error',
          message: error.message,
        });
    }
  }
  
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }
  
  next(error);
};