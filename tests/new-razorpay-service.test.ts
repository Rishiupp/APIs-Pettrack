import { NewRazorpayService } from '../src/services/payments/new-razorpay.service';
import { CryptoUtil } from '../src/utils/crypto';
import prisma from '../src/config/database';
import Razorpay from 'razorpay';

// Mock the dependencies
jest.mock('../src/config/database');
jest.mock('razorpay');
jest.mock('../src/utils/crypto');
jest.mock('../src/config', () => ({
  config: {
    razorpay: {
      keyId: 'rzp_test_123',
      keySecret: 'test_secret',
      webhookSecret: 'webhook_secret'
    }
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRazorpay = Razorpay as jest.MockedClass<typeof Razorpay>;
const mockCryptoUtil = CryptoUtil as jest.Mocked<typeof CryptoUtil>;

describe('NewRazorpayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockRazorpay.mockImplementation(() => ({
      orders: {
        create: jest.fn(),
        fetch: jest.fn(),
      },
      payments: {
        fetch: jest.fn(),
        refund: jest.fn(),
      },
    } as any));
  });

  describe('createOrder', () => {
    it('should create order successfully with valid input', async () => {
      const mockUser = { id: 'user_123', isActive: true };
      const mockRazorpayOrder = {
        id: 'order_razorpay_123',
        amount: 50000,
        currency: 'INR',
        created_at: 1640995200,
        notes: { user_id: 'user_123' }
      };
      const mockLocalOrder = {
        id: 'local_order_123',
        userId: 'user_123',
        amountInPaise: BigInt(50000),
        currency: 'INR',
        status: 'created',
        razorpayOrderId: 'order_razorpay_123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.order.create.mockResolvedValue(mockLocalOrder as any);
      
      const mockRazorpayInstance = new (mockRazorpay as any)();
      mockRazorpayInstance.orders.create.mockResolvedValue(mockRazorpayOrder);

      const result = await NewRazorpayService.createOrder({
        amount_in_paise: 50000,
        currency: 'INR',
        user_id: 'user_123',
        receipt: 'order-123',
        metadata: { purpose: 'premium_features' }
      });

      expect(result).toEqual({
        local_order_id: 'local_order_123',
        razorpay_order_id: 'order_razorpay_123',
        key_id: 'rzp_test_123',
        amount_in_paise: 50000,
        currency: 'INR',
        expires_at: expect.any(Number),
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        select: { id: true, isActive: true }
      });
      expect(mockPrisma.order.create).toHaveBeenCalled();
    });

    it('should reject order for inactive user', async () => {
      const mockUser = { id: 'user_123', isActive: false };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      await expect(NewRazorpayService.createOrder({
        amount_in_paise: 50000,
        currency: 'INR',
        user_id: 'user_123',
      })).rejects.toThrow('User not found or inactive');
    });

    it('should reject order for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(NewRazorpayService.createOrder({
        amount_in_paise: 50000,
        currency: 'INR',
        user_id: 'non_existent_user',
      })).rejects.toThrow('User not found or inactive');
    });

    it('should validate server-computed amount', async () => {
      const mockUser = { id: 'user_123', isActive: true };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      // Client sends 60000 but server computes 100000 for premium_features - should fail
      await expect(NewRazorpayService.createOrder({
        amount_in_paise: 60000, // Client amount
        currency: 'INR',
        user_id: 'user_123',
        metadata: { purpose: 'premium_features' } // Server will compute 100000 for this
      })).rejects.toThrow('Amount mismatch');
    });
  });

  describe('verifyPayment', () => {
    const mockOrder = {
      id: 'local_order_123',
      userId: 'user_123',
      amountInPaise: BigInt(50000), // In paise as BigInt
      razorpayOrderId: 'order_razorpay_123',
      status: 'created',
    };

    const mockPayment = {
      id: 'pay_razorpay_123',
      order_id: 'order_razorpay_123',
      amount: 50000, // In paise
      currency: 'INR',
      status: 'captured',
      captured: true,
      method: 'card',
      card: { last4: '4242', network: 'visa' }
    };

    beforeEach(() => {
      mockPrisma.payment.findUnique.mockResolvedValue(null); // No existing payment
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCryptoUtil.verifyRazorpaySignature.mockReturnValue(true);
      
      const mockRazorpayInstance = new (mockRazorpay as any)();
      mockRazorpayInstance.payments.fetch.mockResolvedValue(mockPayment);
    });

    it('should verify payment successfully with valid signature', async () => {
      const mockUpdatedOrder = { ...mockOrder, status: 'paid' };
      const mockCreatedPayment = {
        id: 'payment_local_123',
        razorpayPaymentId: 'pay_razorpay_123',
        razorpayOrderId: 'order_razorpay_123',
        amountInPaise: BigInt(50000),
        currency: 'INR',
        method: 'card',
        status: 'captured',
        captured: true,
        signatureValid: true,
      };

      mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder as any);
      mockPrisma.payment.create.mockResolvedValue(mockCreatedPayment as any);

      const result = await NewRazorpayService.verifyPayment({
        local_order_id: 'local_order_123',
        razorpay_payment_id: 'pay_razorpay_123',
        razorpay_order_id: 'order_razorpay_123',
        razorpay_signature: 'valid_signature',
      });

      expect(result.verified).toBe(true);
      expect(result.payment_record.razorpay_payment_id).toBe('pay_razorpay_123');
      expect(result.payment_record.signature_valid).toBe(true);
      
      expect(mockCryptoUtil.verifyRazorpaySignature).toHaveBeenCalledWith(
        'order_razorpay_123',
        'pay_razorpay_123',
        'valid_signature',
        'test_secret'
      );
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'local_order_123' },
        data: { status: 'paid' }
      });
      expect(mockPrisma.payment.create).toHaveBeenCalled();
    });

    it('should return existing payment record for idempotency', async () => {
      const existingPayment = {
        id: 'payment_local_123',
        razorpayPaymentId: 'pay_razorpay_123',
        razorpayOrderId: 'order_razorpay_123',
        amountInPaise: BigInt(50000),
        currency: 'INR',
        method: 'card',
        status: 'captured',
        captured: true,
        capturedAt: new Date(),
        card: { last4: '4242' },
        rawPaymentPayload: mockPayment,
        signatureValid: true,
      };

      mockPrisma.payment.findUnique.mockResolvedValue(existingPayment as any);

      const result = await NewRazorpayService.verifyPayment({
        local_order_id: 'local_order_123',
        razorpay_payment_id: 'pay_razorpay_123',
        razorpay_order_id: 'order_razorpay_123',
        razorpay_signature: 'valid_signature',
      });

      expect(result.verified).toBe(true);
      expect(result.payment_record.local_payment_id).toBe('payment_local_123');
      
      // Should not create new payment or update order
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should reject payment with invalid signature', async () => {
      mockCryptoUtil.verifyRazorpaySignature.mockReturnValue(false);

      await expect(NewRazorpayService.verifyPayment({
        local_order_id: 'local_order_123',
        razorpay_payment_id: 'pay_razorpay_123',
        razorpay_order_id: 'order_razorpay_123',
        razorpay_signature: 'invalid_signature',
      })).rejects.toThrow('Invalid payment signature');

      // Should create failed payment record
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'failed',
          signatureValid: false,
          verificationMethod: 'hmac'
        })
      });
    });

    it('should reject payment with amount mismatch', async () => {
      const mockPaymentWithWrongAmount = { ...mockPayment, amount: 60000 };
      const mockRazorpayInstance = new (mockRazorpay as any)();
      mockRazorpayInstance.payments.fetch.mockResolvedValue(mockPaymentWithWrongAmount);

      await expect(NewRazorpayService.verifyPayment({
        local_order_id: 'local_order_123',
        razorpay_payment_id: 'pay_razorpay_123',
        razorpay_order_id: 'order_razorpay_123',
        razorpay_signature: 'valid_signature',
      })).rejects.toThrow('Amount mismatch');
    });

    it('should reject payment that is not captured', async () => {
      const mockUncapturedPayment = { ...mockPayment, status: 'authorized', captured: false };
      const mockRazorpayInstance = new (mockRazorpay as any)();
      mockRazorpayInstance.payments.fetch.mockResolvedValue(mockUncapturedPayment);

      await expect(NewRazorpayService.verifyPayment({
        local_order_id: 'local_order_123',
        razorpay_payment_id: 'pay_razorpay_123',
        razorpay_order_id: 'order_razorpay_123',
        razorpay_signature: 'valid_signature',
      })).rejects.toThrow('Payment not captured');

      // Should create failed payment record
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'failed',
          signatureValid: true,
        })
      });
    });

    it('should reject verification for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(NewRazorpayService.verifyPayment({
        local_order_id: 'non_existent_order',
        razorpay_payment_id: 'pay_razorpay_123',
        razorpay_order_id: 'order_razorpay_123',
        razorpay_signature: 'valid_signature',
      })).rejects.toThrow('Order not found');
    });

    it('should reject verification for already processed order', async () => {
      const processedOrder = { ...mockOrder, status: 'paid' };
      mockPrisma.order.findUnique.mockResolvedValue(processedOrder as any);

      await expect(NewRazorpayService.verifyPayment({
        local_order_id: 'local_order_123',
        razorpay_payment_id: 'pay_razorpay_123',
        razorpay_order_id: 'order_razorpay_123',
        razorpay_signature: 'valid_signature',
      })).rejects.toThrow('Order already processed or invalid status');
    });
  });

  describe('handleWebhook - Idempotency Tests', () => {
    const mockWebhookPayload = {
      event: 'payment.captured',
      event_id: 'evt_123',
      payload: {
        payment: {
          entity: {
            id: 'pay_123',
            amount: 50000,
            status: 'captured'
          }
        }
      }
    };

    beforeEach(() => {
      mockCryptoUtil.verifyWebhookSignature.mockReturnValue(true);
    });

    it('should process webhook event successfully on first attempt', async () => {
      const mockWebhookEvent = {
        id: 'webhook_123',
        razorpayEventId: 'evt_123',
        processedAt: null,
      };

      mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.webhookEvent.upsert.mockResolvedValue(mockWebhookEvent as any);
      mockPrisma.webhookEvent.update.mockResolvedValue({} as any);
      mockPrisma.payment.findUnique.mockResolvedValue(null); // No existing payment

      const result = await NewRazorpayService.handleWebhook(
        JSON.stringify(mockWebhookPayload),
        'valid_signature',
        { 'X-Razorpay-Signature': 'valid_signature' }
      );

      expect(result.message).toBe('Webhook processed successfully');
      expect(mockPrisma.webhookEvent.upsert).toHaveBeenCalled();
      expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'webhook_123' },
        data: {
          processedAt: expect.any(Date),
          processingResult: { status: 'success' }
        }
      });
    });

    it('should return success for already processed webhook (idempotency)', async () => {
      const processedWebhookEvent = {
        id: 'webhook_123',
        razorpayEventId: 'evt_123',
        processedAt: new Date(),
      };

      mockPrisma.webhookEvent.findUnique.mockResolvedValue(processedWebhookEvent as any);

      const result = await NewRazorpayService.handleWebhook(
        JSON.stringify(mockWebhookPayload),
        'valid_signature',
        { 'X-Razorpay-Signature': 'valid_signature' }
      );

      expect(result.message).toBe('Webhook already processed');
      
      // Should not create or update webhook event again
      expect(mockPrisma.webhookEvent.upsert).not.toHaveBeenCalled();
    });

    it('should reject webhook with invalid signature', async () => {
      mockCryptoUtil.verifyWebhookSignature.mockReturnValue(false);

      await expect(NewRazorpayService.handleWebhook(
        JSON.stringify(mockWebhookPayload),
        'invalid_signature',
        { 'X-Razorpay-Signature': 'invalid_signature' }
      )).rejects.toThrow('Invalid webhook signature');
    });

    it('should handle processing error gracefully', async () => {
      const mockWebhookEvent = {
        id: 'webhook_123',
        razorpayEventId: 'evt_123',
        processedAt: null,
      };

      mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.webhookEvent.upsert.mockResolvedValue(mockWebhookEvent as any);
      
      // Mock payment processing to throw error
      mockPrisma.payment.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(NewRazorpayService.handleWebhook(
        JSON.stringify(mockWebhookPayload),
        'valid_signature',
        { 'X-Razorpay-Signature': 'valid_signature' }
      )).rejects.toThrow('Database error');

      // Should record processing result with error
      expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'webhook_123' },
        data: {
          processingResult: { 
            status: 'error', 
            error: 'Database error' 
          }
        }
      });
    });
  });

  describe('webhook event processing', () => {
    it('should update payment status on payment.captured event', async () => {
      const mockPayment = {
        id: 'payment_local_123',
        razorpayPaymentId: 'pay_123',
        status: 'authorized',
        localOrderId: 'order_123',
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment as any);
      mockPrisma.payment.update.mockResolvedValue({} as any);
      mockPrisma.order.update.mockResolvedValue({} as any);

      const capturedPayload = {
        event: 'payment.captured',
        event_id: 'evt_123',
        payload: {
          payment: {
            entity: { id: 'pay_123' }
          }
        }
      };

      const mockWebhookEvent = { id: 'webhook_123', processedAt: null };
      mockCryptoUtil.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.webhookEvent.upsert.mockResolvedValue(mockWebhookEvent as any);
      mockPrisma.webhookEvent.update.mockResolvedValue({} as any);

      await NewRazorpayService.handleWebhook(
        JSON.stringify(capturedPayload),
        'valid_signature',
        {}
      );

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment_local_123' },
        data: {
          status: 'captured',
          captured: true,
          capturedAt: expect.any(Date),
          rawPaymentPayload: { id: 'pay_123' },
        }
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order_123' },
        data: { status: 'paid' }
      });
    });

    it('should update payment status on payment.failed event', async () => {
      const mockPayment = {
        id: 'payment_local_123',
        razorpayPaymentId: 'pay_123',
        status: 'authorized',
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment as any);
      mockPrisma.payment.update.mockResolvedValue({} as any);

      const failedPayload = {
        event: 'payment.failed',
        event_id: 'evt_123',
        payload: {
          payment: {
            entity: {
              id: 'pay_123',
              error_description: 'Card declined'
            }
          }
        }
      };

      const mockWebhookEvent = { id: 'webhook_123', processedAt: null };
      mockCryptoUtil.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.webhookEvent.upsert.mockResolvedValue(mockWebhookEvent as any);
      mockPrisma.webhookEvent.update.mockResolvedValue({} as any);

      await NewRazorpayService.handleWebhook(
        JSON.stringify(failedPayload),
        'valid_signature',
        {}
      );

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment_local_123' },
        data: {
          status: 'failed',
          rawPaymentPayload: {
            id: 'pay_123',
            error_description: 'Card declined'
          },
        }
      });
    });
  });

  describe('signature verification integration', () => {
    it('should verify checkout signature correctly', async () => {
      mockCryptoUtil.verifyRazorpaySignature.mockReturnValue(true);

      const isValid = mockCryptoUtil.verifyRazorpaySignature(
        'order_123',
        'pay_123',
        'expected_signature',
        'secret'
      );

      expect(isValid).toBe(true);
      expect(mockCryptoUtil.verifyRazorpaySignature).toHaveBeenCalledWith(
        'order_123',
        'pay_123',
        'expected_signature',
        'secret'
      );
    });

    it('should verify webhook signature correctly', async () => {
      mockCryptoUtil.verifyWebhookSignature.mockReturnValue(true);

      const isValid = mockCryptoUtil.verifyWebhookSignature(
        'raw_body',
        'signature',
        'webhook_secret'
      );

      expect(isValid).toBe(true);
      expect(mockCryptoUtil.verifyWebhookSignature).toHaveBeenCalledWith(
        'raw_body',
        'signature',
        'webhook_secret'
      );
    });
  });
});