import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { CryptoUtil } from '../../utils/crypto';

interface CreateOrderRequest {
  amount_in_paise: number;
  currency: string;
  user_id: string;
  receipt?: string;
  metadata?: Record<string, any>;
  callback_url?: string;
}

interface CreateOrderResponse {
  local_order_id: string;
  razorpay_order_id: string;
  key_id: string;
  amount_in_paise: number;
  currency: string;
  expires_at?: number;
}

interface VerifyPaymentRequest {
  local_order_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  client_meta?: Record<string, any>;
}

interface VerifyPaymentResponse {
  verified: boolean;
  payment_record: {
    local_payment_id: string;
    razorpay_payment_id: string;
    razorpay_order_id: string;
    amount_in_paise: number;
    currency: string;
    method: string;
    card?: Record<string, any>;
    status: string;
    captured: boolean;
    captured_at?: number;
    raw_payload: Record<string, any>;
    signature_valid: boolean;
  };
}

export class NewRazorpayService {
  private static razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });

  /**
   * POST /create-order
   * Create an Order in Razorpay then persist a local order record
   */
  static async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    const { amount_in_paise, currency, user_id, receipt, metadata, callback_url } = request;

    // Validate input - amount should be computed server-side
    // In a real implementation, compute final amount based on business logic
    // Don't trust the client amount directly
    const serverComputedAmount = await this.computeServerAmount(user_id, metadata);
    if (serverComputedAmount !== amount_in_paise) {
      throw new Error('Amount mismatch. Server computed amount differs from client amount.');
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, isActive: true }
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate receipt if not provided
    const orderReceipt = receipt || `order-${Date.now()}-${user_id.slice(-8)}`;

    // Call Razorpay Orders API
    const razorpayOrder = await this.razorpay.orders.create({
      amount: amount_in_paise,
      currency: currency.toUpperCase(),
      receipt: orderReceipt,
      notes: {
        user_id,
        ...(metadata || {})
      },
    });

    // Set expiry if configured (optional)
    const expiresAt = Date.now() + (1000 * 60 * 60); // 1 hour from now

    // Create local order record
    const localOrder = await prisma.order.create({
      data: {
        userId: user_id,
        razorpayOrderId: razorpayOrder.id,
        receipt: orderReceipt,
        amountInPaise: BigInt(amount_in_paise),
        currency: currency.toUpperCase(),
        status: 'created',
        notes: razorpayOrder.notes,
        metadata: metadata || {},
        expiresAt: new Date(expiresAt),
        rawOrderPayload: JSON.parse(JSON.stringify(razorpayOrder)),
      }
    });

    return {
      local_order_id: localOrder.id,
      razorpay_order_id: razorpayOrder.id,
      key_id: config.razorpay.keyId,
      amount_in_paise: Number(razorpayOrder.amount),
      currency: razorpayOrder.currency,
      expires_at: Math.floor(expiresAt / 1000),
    };
  }

  /**
   * POST /verify-payment
   * Verify the client-provided checkout result with server-side signature verification
   */
  static async verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    const { 
      local_order_id, 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      client_meta 
    } = request;

    // Check if payment with this razorpay_payment_id already exists (idempotency)
    const existingPayment = await prisma.payment.findUnique({
      where: { razorpayPaymentId: razorpay_payment_id }
    });

    if (existingPayment) {
      // Payment already processed, return existing record
      return {
        verified: existingPayment.signatureValid || false,
        payment_record: {
          local_payment_id: existingPayment.id,
          razorpay_payment_id: existingPayment.razorpayPaymentId,
          razorpay_order_id: existingPayment.razorpayOrderId,
          amount_in_paise: Number(existingPayment.amountInPaise),
          currency: existingPayment.currency,
          method: existingPayment.method || '',
          card: existingPayment.card as Record<string, any> || undefined,
          status: existingPayment.status,
          captured: existingPayment.captured,
          captured_at: existingPayment.capturedAt ? Math.floor(existingPayment.capturedAt.getTime() / 1000) : undefined,
          raw_payload: existingPayment.rawPaymentPayload as Record<string, any> || {},
          signature_valid: existingPayment.signatureValid || false,
        }
      };
    }

    // Load local order record
    const localOrder = await prisma.order.findUnique({
      where: { id: local_order_id },
    });

    if (!localOrder) {
      throw new Error('Order not found');
    }

    if (localOrder.razorpayOrderId !== razorpay_order_id) {
      throw new Error('Order ID mismatch');
    }

    if (localOrder.status !== 'created') {
      throw new Error('Order already processed or invalid status');
    }

    // 1. Verify Checkout signature using HMAC-SHA256
    const isSignatureValid = CryptoUtil.verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      config.razorpay.keySecret
    );

    if (!isSignatureValid) {
      // Create failed payment record
      const failedPayment = await prisma.payment.create({
        data: {
          localOrderId: local_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          amountInPaise: localOrder.amountInPaise,
          currency: localOrder.currency,
          status: 'failed',
          signatureValid: false,
          signatureVerifiedAt: new Date(),
          verificationMethod: 'hmac',
          clientMeta: client_meta || {},
        }
      });
      
      throw new Error('Invalid payment signature');
    }

    // 2. Fetch payment details from Razorpay API to confirm status and amount
    const payment = await this.razorpay.payments.fetch(razorpay_payment_id);

    // 3. Cross-check amounts
    const expectedAmountPaise = Number(localOrder.amountInPaise);
    if (payment.amount !== expectedAmountPaise) {
      throw new Error(`Amount mismatch. Expected: ${expectedAmountPaise}, Got: ${payment.amount}`);
    }

    // 4. Verify payment is captured
    if (payment.status !== 'captured') {
      const failedPayment = await prisma.payment.create({
        data: {
          localOrderId: local_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          amountInPaise: BigInt(payment.amount),
          currency: payment.currency,
          method: payment.method,
          status: 'failed',
          signatureValid: true,
          signatureVerifiedAt: new Date(),
          verificationMethod: 'hmac',
          rawPaymentPayload: JSON.parse(JSON.stringify(payment)),
          clientMeta: client_meta || {},
        }
      });
      
      throw new Error(`Payment not captured. Status: ${payment.status}`);
    }

    // 5. Update Order status and create Payment record
    await prisma.order.update({
      where: { id: local_order_id },
      data: { status: 'paid' }
    });

    const successPayment = await prisma.payment.create({
      data: {
        localOrderId: local_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        amountInPaise: BigInt(payment.amount),
        currency: payment.currency,
        method: payment.method,
        status: 'captured',
        captured: payment.captured || false,
        capturedAt: payment.created_at ? new Date(payment.created_at * 1000) : new Date(),
        bank: payment.bank || undefined,
        vpa: payment.vpa || undefined,
        card: payment.card ? JSON.parse(JSON.stringify(payment.card)) : undefined,
        fee: payment.fee ? BigInt(payment.fee) : undefined,
        tax: payment.tax ? BigInt(payment.tax) : undefined,
        signatureValid: true,
        signatureVerifiedAt: new Date(),
        verificationMethod: 'hmac',
        rawPaymentPayload: JSON.parse(JSON.stringify(payment)),
        clientMeta: client_meta || {},
      }
    });

    // Build response
    const paymentRecord = {
      local_payment_id: successPayment.id,
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      amount_in_paise: payment.amount,
      currency: payment.currency,
      method: payment.method,
      card: payment.card || undefined,
      status: payment.status,
      captured: payment.captured || false,
      captured_at: payment.created_at ? Math.floor(payment.created_at * 1000) : undefined,
      raw_payload: payment,
      signature_valid: isSignatureValid,
    };

    return {
      verified: true,
      payment_record: paymentRecord,
    };
  }

  /**
   * POST /razorpay-webhook
   * Handle webhook events from Razorpay with idempotency
   */
  static async handleWebhook(
    rawBody: string, 
    signature: string,
    headers: Record<string, any>
  ): Promise<{ message: string }> {
    
    // 1. Verify webhook signature using webhook secret
    const webhookSecret = config.razorpay.webhookSecret;
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const isSignatureValid = CryptoUtil.verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret
    );

    if (!isSignatureValid) {
      throw new Error('Invalid webhook signature');
    }

    // 2. Parse event payload
    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || `${payload.created_at}_${crypto.randomBytes(8).toString('hex')}`;
    const eventType = payload.event;

    // 3. Implement idempotency - check if this event has already been processed
    const existingWebhook = await prisma.webhookEvent.findUnique({
      where: { razorpayEventId: eventId }
    });

    if (existingWebhook && existingWebhook.processedAt) {
      // Event already processed, return success to avoid retries
      return { message: 'Webhook already processed' };
    }

    // 4. Store webhook event for audit and idempotency
    const webhookEvent = await prisma.webhookEvent.upsert({
      where: { razorpayEventId: eventId },
      update: {
        // Update processing attempt count could be added here
      },
      create: {
        razorpayEventId: eventId,
        eventType: eventType,
        rawEvent: payload,
        headers: headers,
        signatureValid: isSignatureValid,
      }
    });

    try {
      // 5. Process webhook event based on type
      await this.processWebhookEvent(payload);

      // 6. Mark as processed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processedAt: new Date(),
          processingResult: { status: 'success' }
        }
      });

      return { message: 'Webhook processed successfully' };

    } catch (error) {
      // Log error but don't fail the webhook - we've stored it for retry
      console.error('Webhook processing error:', error);
      
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingResult: { 
            status: 'error', 
            error: error instanceof Error ? error.message : String(error) 
          }
        }
      });

      throw error;
    }
  }

  /**
   * Process different webhook event types
   */
  private static async processWebhookEvent(payload: any): Promise<void> {
    const eventType = payload.event;
    
    switch (eventType) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload.payload?.payment?.entity);
        break;
        
      case 'payment.failed':
        await this.handlePaymentFailed(payload.payload?.payment?.entity);
        break;
        
      case 'order.paid':
        await this.handleOrderPaid(payload.payload?.order?.entity);
        break;
        
      case 'payment.authorized':
        await this.handlePaymentAuthorized(payload.payload?.payment?.entity);
        break;
        
      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
        // Store for manual review but don't fail
        break;
    }
  }

  private static async handlePaymentCaptured(paymentData: any): Promise<void> {
    if (!paymentData) return;

    const payment = await prisma.payment.findUnique({
      where: { razorpayPaymentId: paymentData.id }
    });

    if (payment && payment.status !== 'captured') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'captured',
          captured: true,
          capturedAt: new Date(),
          rawPaymentPayload: JSON.parse(JSON.stringify(paymentData)),
        }
      });

      // Update order status
      await prisma.order.update({
        where: { id: payment.localOrderId },
        data: { status: 'paid' }
      });
      
      console.log(`Payment ${paymentData.id} marked as captured via webhook`);
    }
  }

  private static async handlePaymentFailed(paymentData: any): Promise<void> {
    if (!paymentData) return;

    const payment = await prisma.payment.findUnique({
      where: { razorpayPaymentId: paymentData.id }
    });

    if (payment && payment.status !== 'failed') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          rawPaymentPayload: JSON.parse(JSON.stringify(paymentData)),
        }
      });
      
      console.log(`Payment ${paymentData.id} marked as failed via webhook`);
    }
  }

  private static async handlePaymentAuthorized(paymentData: any): Promise<void> {
    if (!paymentData) return;

    const payment = await prisma.payment.findUnique({
      where: { razorpayPaymentId: paymentData.id }
    });

    if (payment && payment.status === 'created') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'authorized',
          rawPaymentPayload: JSON.parse(JSON.stringify(paymentData)),
        }
      });
      
      console.log(`Payment ${paymentData.id} marked as authorized via webhook`);
    }
  }

  private static async handleOrderPaid(orderData: any): Promise<void> {
    if (!orderData) return;
    
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: orderData.id }
    });

    if (order && order.status !== 'paid') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'paid' }
      });
      
      console.log(`Order ${orderData.id} marked as paid via webhook`);
    }
  }

  /**
   * Server-side amount computation - implement your business logic here
   */
  private static async computeServerAmount(
    userId: string, 
    metadata?: Record<string, any>
  ): Promise<number> {
    // Implement your server-side amount calculation logic
    // This is a placeholder - replace with actual business logic
    
    // Example: Different amounts based on user type or metadata
    if (metadata?.purpose === 'qr_registration') {
      return 50000; // ₹500 in paise
    }
    
    if (metadata?.purpose === 'premium_features') {
      return 100000; // ₹1000 in paise  
    }

    if (metadata?.purpose === 'pet_registration') {
      return 200000; // ₹2000 in paise
    }
    
    // Default amount
    return metadata?.amount_in_paise || 10000; // ₹100 in paise
  }
}