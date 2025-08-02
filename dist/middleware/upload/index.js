"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadError = exports.getFileUrl = exports.uploadMixed = exports.uploadAttachments = exports.uploadDocuments = exports.uploadQRImage = exports.uploadProfileImage = exports.uploadFields = exports.uploadMultiple = exports.uploadSingle = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../../config");
const validation_1 = require("../../utils/validation");
const types_1 = require("../../types");
const storage = multer_1.default.diskStorage({
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
        const ext = path_1.default.extname(file.originalname);
        const baseName = path_1.default.basename(file.originalname, ext);
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    },
});
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'profileImage' || file.fieldname === 'qrImage') {
        if (!validation_1.ValidationUtil.validateFileType(file.mimetype, config_1.config.upload.allowedImageTypes)) {
            return cb(new types_1.AppError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400));
        }
    }
    else if (file.fieldname === 'document' || file.fieldname === 'attachment') {
        const allowedTypes = [
            ...config_1.config.upload.allowedImageTypes,
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!validation_1.ValidationUtil.validateFileType(file.mimetype, allowedTypes)) {
            return cb(new types_1.AppError('Invalid file type. Only images, PDFs, and Word documents are allowed.', 400));
        }
    }
    if (!validation_1.ValidationUtil.validateFileSize(file.size || 0, config_1.config.upload.maxFileSize)) {
        return cb(new types_1.AppError(`File too large. Maximum size allowed is ${config_1.config.upload.maxFileSize} bytes.`, 400));
    }
    cb(null, true);
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: config_1.config.upload.maxFileSize,
        files: 5,
    },
});
const uploadSingle = (fieldName) => {
    return upload.single(fieldName);
};
exports.uploadSingle = uploadSingle;
const uploadMultiple = (fieldName, maxCount = 5) => {
    return upload.array(fieldName, maxCount);
};
exports.uploadMultiple = uploadMultiple;
const uploadFields = (fields) => {
    return upload.fields(fields);
};
exports.uploadFields = uploadFields;
exports.uploadProfileImage = (0, exports.uploadSingle)('profileImage');
exports.uploadQRImage = (0, exports.uploadSingle)('qrImage');
exports.uploadDocuments = (0, exports.uploadMultiple)('document', 5);
exports.uploadAttachments = (0, exports.uploadMultiple)('attachment', 3);
exports.uploadMixed = (0, exports.uploadFields)([
    { name: 'profileImage', maxCount: 1 },
    { name: 'document', maxCount: 3 },
]);
const getFileUrl = (filename, type = 'document') => {
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
exports.getFileUrl = getFileUrl;
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(413).json({
                    success: false,
                    error: 'File too large',
                    message: `Maximum file size allowed is ${config_1.config.upload.maxFileSize} bytes`,
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
    if (error instanceof types_1.AppError) {
        return res.status(error.statusCode).json({
            success: false,
            error: error.message,
        });
    }
    next(error);
};
exports.handleUploadError = handleUploadError;
//# sourceMappingURL=index.js.map