import { ValidationError } from '../types';

export class ValidationUtil {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhone(phone: string): boolean {
    // Indian phone number format: +91XXXXXXXXXX or XXXXXXXXXX
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  static isValidOTP(otp: string): boolean {
    const otpRegex = /^\d{6}$/;
    return otpRegex.test(otp);
  }

  static isValidMicrochip(microchipId: string): boolean {
    // ISO 11784/11785 standard: 15 digits
    const microchipRegex = /^\d{15}$/;
    return microchipRegex.test(microchipId);
  }

  static isValidPostalCode(postalCode: string, countryCode: string = 'IN'): boolean {
    if (countryCode === 'IN') {
      const indianPostalRegex = /^\d{6}$/;
      return indianPostalRegex.test(postalCode);
    }
    // Add more country validations as needed
    return postalCode.length >= 3 && postalCode.length <= 10;
  }

  static isValidWeight(weight: number): boolean {
    return weight > 0 && weight <= 200; // 200kg max
  }

  static isValidHeight(height: number): boolean {
    return height > 0 && height <= 200; // 200cm max
  }

  static isValidAmount(amount: number): boolean {
    return amount > 0 && amount <= 100000; // 1 lakh max
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static sanitizePhone(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If starts with +91, keep it; otherwise add +91 if it's a 10-digit number
    if (cleaned.startsWith('+91')) {
      return cleaned;
    } else if (cleaned.length === 10) {
      return '+91' + cleaned;
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      return '+' + cleaned;
    }
    
    return cleaned;
  }

  static validateRequired(fields: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];

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

  static validateEmail(email: string): ValidationError | null {
    if (!email) {
      return { field: 'email', message: 'Email is required' };
    }

    if (!this.isValidEmail(email)) {
      return { field: 'email', message: 'Invalid email format', value: email };
    }

    return null;
  }

  static validatePhone(phone: string): ValidationError | null {
    if (!phone) {
      return { field: 'phone', message: 'Phone number is required' };
    }

    if (!this.isValidPhone(phone)) {
      return { field: 'phone', message: 'Invalid phone number format', value: phone };
    }

    return null;
  }

  static validateOTP(otp: string): ValidationError | null {
    if (!otp) {
      return { field: 'otp', message: 'OTP is required' };
    }

    if (!this.isValidOTP(otp)) {
      return { field: 'otp', message: 'OTP must be 6 digits', value: otp };
    }

    return null;
  }

  static validateDateNotFuture(date: string, fieldName: string): ValidationError | null {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (inputDate > today) {
      return {
        field: fieldName,
        message: `${fieldName} cannot be in the future`,
        value: date,
      };
    }

    return null;
  }

  static validateAge(birthDate: string, maxAge: number = 30): ValidationError | null {
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

  static validateFileType(mimetype: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimetype);
  }

  static validateFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize;
  }

  static validateCoordinates(latitude: number, longitude: number): ValidationError[] {
    const errors: ValidationError[] = [];

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

  static validatePagination(page?: number, limit?: number): {
    page: number;
    limit: number;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    let validPage = 1;
    let validLimit = 25;

    if (page !== undefined) {
      if (page < 1) {
        errors.push({
          field: 'page',
          message: 'Page must be greater than 0',
          value: page,
        });
      } else {
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
      } else {
        validLimit = limit;
      }
    }

    return { page: validPage, limit: validLimit, errors };
  }
}