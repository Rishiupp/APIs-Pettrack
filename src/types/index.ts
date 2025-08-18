import { Request } from 'express';
import { UserRole } from '@prisma/client';

// Auth types
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

// API Response types
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

// Pagination types
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

// File upload types
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

// OTP types
export interface OTPRequest {
  identifier: string; // phone or email
  purpose: 'login' | 'registration' | 'phone_verification' | 'email_verification' | 'password_reset';
  deliveryMethod?: 'phone' | 'email'; // auto-detected if not provided
}

export interface OTPVerification {
  identifier: string; // phone or email
  code: string;
  transactionId?: string;
}

// Login types
export interface LoginOTPRequest {
  identifier: string; // phone or email
  deliveryMethod?: 'phone' | 'email'; // auto-detected if not provided
}

export interface LoginOTPVerification {
  identifier: string; // phone or email
  otpCode: string;
}

// Location types
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

// QR Code scan types
export interface QRScanRequest {
  location?: Location;
}

// Payment types
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

// Notification types
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

// Support ticket types
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

// Pet registration types
export interface PetRegistration {
  name: string;
  speciesId?: number;
  breed?: string;
  secondaryBreed?: string;
  gender: 'male' | 'female' | 'unknown';
  birthDate?: string;
  color?: string;
  weight?: number;
  height?: number;
  distinctiveMarks?: string;
  isSpayedNeutered?: boolean;
  specialNeeds?: string;
  behavioralNotes?: string;
  vaccinations?: VaccinationInput[];
}

export interface VaccinationInput {
  vaccineName: string;
  administeredDate: string;
  expirationDate?: string;
  batchNumber?: string;
  veterinarianName?: string;
  clinicName?: string;
  notes?: string;
}

// Executive registration types
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

// Admin dashboard types
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

// Error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Webhook types
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

// Device token types
export interface DeviceRegistration {
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceInfo?: {
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };
}