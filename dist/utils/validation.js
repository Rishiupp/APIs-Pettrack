"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtil = void 0;
class ValidationUtil {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static isValidPhone(phone) {
        const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
        return phoneRegex.test(phone.replace(/\s+/g, ''));
    }
    static isValidOTP(otp) {
        const otpRegex = /^\d{6}$/;
        return otpRegex.test(otp);
    }
    static isValidMicrochip(microchipId) {
        const microchipRegex = /^\d{15}$/;
        return microchipRegex.test(microchipId);
    }
    static isValidPostalCode(postalCode, countryCode = 'IN') {
        if (countryCode === 'IN') {
            const indianPostalRegex = /^\d{6}$/;
            return indianPostalRegex.test(postalCode);
        }
        return postalCode.length >= 3 && postalCode.length <= 10;
    }
    static isValidWeight(weight) {
        return weight > 0 && weight <= 200;
    }
    static isValidHeight(height) {
        return height > 0 && height <= 200;
    }
    static isValidAmount(amount) {
        return amount > 0 && amount <= 100000;
    }
    static sanitizeString(input) {
        return input.trim().replace(/[<>]/g, '');
    }
    static sanitizePhone(phone) {
        let cleaned = phone.replace(/[^\d+]/g, '');
        if (cleaned.startsWith('+91')) {
            return cleaned;
        }
        else if (cleaned.length === 10) {
            return '+91' + cleaned;
        }
        else if (cleaned.startsWith('91') && cleaned.length === 12) {
            return '+' + cleaned;
        }
        return cleaned;
    }
    static validateRequired(fields) {
        const errors = [];
        for (const [field, value] of Object.entries(fields)) {
            if (value === undefined || value === null || value === '') {
                errors.push({
                    field,
                    message: `${field} is required`,
                    value,
                });
            }
        }
        return errors;
    }
    static validateEmail(email) {
        if (!email) {
            return { field: 'email', message: 'Email is required' };
        }
        if (!this.isValidEmail(email)) {
            return { field: 'email', message: 'Invalid email format', value: email };
        }
        return null;
    }
    static validatePhone(phone) {
        if (!phone) {
            return { field: 'phone', message: 'Phone number is required' };
        }
        if (!this.isValidPhone(phone)) {
            return { field: 'phone', message: 'Invalid phone number format', value: phone };
        }
        return null;
    }
    static validateOTP(otp) {
        if (!otp) {
            return { field: 'otp', message: 'OTP is required' };
        }
        if (!this.isValidOTP(otp)) {
            return { field: 'otp', message: 'OTP must be 6 digits', value: otp };
        }
        return null;
    }
    static validateDateNotFuture(date, fieldName) {
        const inputDate = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (inputDate > today) {
            return {
                field: fieldName,
                message: `${fieldName} cannot be in the future`,
                value: date,
            };
        }
        return null;
    }
    static validateAge(birthDate, maxAge = 30) {
        const birth = new Date(birthDate);
        const today = new Date();
        const ageInYears = (today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (ageInYears > maxAge) {
            return {
                field: 'birthDate',
                message: `Pet age cannot exceed ${maxAge} years`,
                value: birthDate,
            };
        }
        return null;
    }
    static validateFileType(mimetype, allowedTypes) {
        return allowedTypes.includes(mimetype);
    }
    static validateFileSize(size, maxSize) {
        return size <= maxSize;
    }
    static validateCoordinates(latitude, longitude) {
        const errors = [];
        if (latitude < -90 || latitude > 90) {
            errors.push({
                field: 'latitude',
                message: 'Latitude must be between -90 and 90',
                value: latitude,
            });
        }
        if (longitude < -180 || longitude > 180) {
            errors.push({
                field: 'longitude',
                message: 'Longitude must be between -180 and 180',
                value: longitude,
            });
        }
        return errors;
    }
    static validatePagination(page, limit) {
        const errors = [];
        let validPage = 1;
        let validLimit = 25;
        if (page !== undefined) {
            if (page < 1) {
                errors.push({
                    field: 'page',
                    message: 'Page must be greater than 0',
                    value: page,
                });
            }
            else {
                validPage = page;
            }
        }
        if (limit !== undefined) {
            if (limit < 1 || limit > 100) {
                errors.push({
                    field: 'limit',
                    message: 'Limit must be between 1 and 100',
                    value: limit,
                });
            }
            else {
                validLimit = limit;
            }
        }
        return { page: validPage, limit: validLimit, errors };
    }
}
exports.ValidationUtil = ValidationUtil;
//# sourceMappingURL=validation.js.map