// Test setup file
import { jest } from '@jest/globals';

// Mock Prisma client for tests
jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentEvent: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentWebhook: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock Razorpay SDK
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn(),
      fetch: jest.fn(),
    },
    payments: {
      fetch: jest.fn(),
      refund: jest.fn(),
    },
  }));
});