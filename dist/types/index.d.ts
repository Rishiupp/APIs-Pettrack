import { Request } from 'express';
import { UserRole } from '@prisma/client';
export interface JWTPayload {
    sub: string;
    role: UserRole;
    permissions: string[];
    iat: number;
    exp: number;
}
export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: UserRole;
        permissions: string[];
    };
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    errors?: ValidationError[];
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface FileUpload {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    destination: string;
    filename: string;
    path: string;
    size: number;
}
export interface OTPRequest {
    phone: string;
    purpose: 'login' | 'registration' | 'phone_verification' | 'password_reset';
}
export interface OTPVerification {
    phone: string;
    code: string;
    transactionId: string;
}
export interface Location {
    latitude: number;
    longitude: number;
    accuracy?: number;
}
export interface LocationInfo {
    position: Location;
    locationName?: string;
    city?: string;
    state?: string;
    countryCode?: string;
}
export interface QRScanRequest {
    location?: Location;
    scannerContact?: {
        name?: string;
        phone?: string;
        email?: string;
        message?: string;
    };
}
export interface PaymentOrder {
    petId: string;
    amount: number;
    currency: string;
    purpose: 'qr_registration' | 'premium_features' | 'vet_consultation';
}
export interface PaymentVerification {
    razorpayPaymentId: string;
    razorpaySignature: string;
}
export interface NotificationPreferences {
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    scanNotifications: boolean;
    marketingNotifications: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone: string;
}
export interface PushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}
export interface CreateTicketRequest {
    subject: string;
    description: string;
    category: 'technical' | 'billing' | 'pet_related' | 'general';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    petId?: string;
}
export interface TicketMessage {
    message: string;
    attachments?: string[];
}
export interface PetRegistration {
    name: string;
    speciesId?: number;
    breedId?: number;
    secondaryBreedId?: number;
    gender: 'male' | 'female' | 'unknown';
    birthDate?: string;
    color?: string;
    weight?: number;
    height?: number;
    distinctiveMarks?: string;
    isSpayedNeutered?: boolean;
    microchipId?: string;
    specialNeeds?: string;
    behavioralNotes?: string;
    vaccinations?: VaccinationInput[];
}
export interface VaccinationInput {
    vaccineTypeId: number;
    administeredDate: string;
    expirationDate?: string;
    batchNumber?: string;
    veterinarianName?: string;
    clinicName?: string;
    notes?: string;
}
export interface ExecutiveRegistration {
    ownerDetails: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
        address?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        emergencyContactName?: string;
        emergencyContactPhone?: string;
    };
    petDetails: PetRegistration;
    paymentMethod: 'cash' | 'online';
    amount: number;
}
export interface DashboardOverview {
    totalPets: number;
    activePets: number;
    totalUsers: number;
    qrCodesAssigned: number;
    scansToday: number;
    revenueThisMonth: number;
}
export interface AnalyticsQuery {
    period: '24h' | '7d' | '30d' | '90d' | '1y';
    groupBy: 'hour' | 'day' | 'week' | 'month';
    metric: 'registrations' | 'scans' | 'revenue' | 'users';
}
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode: number);
}
export interface RazorpayWebhookEvent {
    event: string;
    payload: {
        payment: {
            entity: any;
        };
        order: {
            entity: any;
        };
    };
}
export interface DeviceRegistration {
    deviceToken: string;
    platform: 'ios' | 'android' | 'web';
    deviceInfo?: {
        model?: string;
        osVersion?: string;
        appVersion?: string;
    };
}
//# sourceMappingURL=index.d.ts.map