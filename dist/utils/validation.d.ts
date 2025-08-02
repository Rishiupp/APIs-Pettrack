import { ValidationError } from '../types';
export declare class ValidationUtil {
    static isValidEmail(email: string): boolean;
    static isValidPhone(phone: string): boolean;
    static isValidOTP(otp: string): boolean;
    static isValidMicrochip(microchipId: string): boolean;
    static isValidPostalCode(postalCode: string, countryCode?: string): boolean;
    static isValidWeight(weight: number): boolean;
    static isValidHeight(height: number): boolean;
    static isValidAmount(amount: number): boolean;
    static sanitizeString(input: string): string;
    static sanitizePhone(phone: string): string;
    static validateRequired(fields: Record<string, any>): ValidationError[];
    static validateEmail(email: string): ValidationError | null;
    static validatePhone(phone: string): ValidationError | null;
    static validateOTP(otp: string): ValidationError | null;
    static validateDateNotFuture(date: string, fieldName: string): ValidationError | null;
    static validateAge(birthDate: string, maxAge?: number): ValidationError | null;
    static validateFileType(mimetype: string, allowedTypes: string[]): boolean;
    static validateFileSize(size: number, maxSize: number): boolean;
    static validateCoordinates(latitude: number, longitude: number): ValidationError[];
    static validatePagination(page?: number, limit?: number): {
        page: number;
        limit: number;
        errors: ValidationError[];
    };
}
//# sourceMappingURL=validation.d.ts.map