"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const response_1 = require("../../utils/response");
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(error => ({
            field: error.type === 'field' ? error.path : 'unknown',
            message: error.msg,
            value: error.type === 'field' ? error.value : undefined,
        }));
        response_1.ResponseHandler.validationError(res, validationErrors);
        return;
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
const validate = (validations) => {
    return [
        ...validations,
        exports.handleValidationErrors,
    ];
};
exports.validate = validate;
//# sourceMappingURL=index.js.map