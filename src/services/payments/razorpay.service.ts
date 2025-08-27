import { PaymentStatus, PaymentPurpose } from '@prisma/client';
import prisma from '../../config/database';
import { CryptoUtil } from '../../utils/crypto';
import { AppError } from '../../types';
import { config } from '../../config';
import { PaymentOrder, PaymentVerification } from '../../types';

// Razorpay API response types
interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
  error?: {
    description: string;
  };
}

interface RazorpayPaymentResponse {
  id: string;
  status: string;
  method: string;
  amount: number;
  currency: string;
  order_id: string;
  created_at: number;
  error?: {
    description: string;
  };
}

interface RazorpayRefundResponse {
  id: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  created_at: number;
  error?: {
    description: string;
  };
}

interface RazorpayErrorResponse {
  error?: {
    description: string;
  };
}

export class RazorpayService {
  // Validate Razorpay configuration
  private static validateRazorpayConfig() {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      throw new AppError('Razorpay configuration missing - check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables', 500);
    }
  }

  static async createPaymentOrder(userId: string, orderData: PaymentOrder) {
    const { petId, amount, currency, purpose } = orderData;

    try {
      // Validate Razorpay configuration
      this.validateRazorpayConfig();

      // Validate the order
      await this.validatePaymentOrder(userId, orderData);

      // Log order creation attempt
      console.log('Creating Razorpay order with data:', {
        amount: Math.round(amount * 100),
        currency: currency.toUpperCase(),
        userId,
        petId,
        purpose
      });

      // Generate unique receipt ID
      const receipt = `receipt_${userId}_${Date.now()}`;

      // Prepare request payload
      const requestData = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency.toUpperCase(),
        receipt,
        partial_payment: true,
        first_payment_min_amount: 230,
        notes: {
          petId,
          userId,
          purpose,
        },
      };

      // Create Basic Auth header
      const credentials = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');

      // Make HTTP request to Razorpay API
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const responseData = await response.json() as RazorpayOrderResponse | RazorpayErrorResponse;

      if (!response.ok) {
        // Handle API error response
        console.error('Razorpay API error:', responseData);
        const errorData = responseData as RazorpayErrorResponse;
        throw new AppError(
          errorData.error?.description || 'Failed to create Razorpay order',
          response.status
        );
      }

      const razorpayOrderData = responseData as RazorpayOrderResponse;
      
      // Log the response from Razorpay
      console.log('Razorpay order created successfully:', {
        orderId: razorpayOrderData.id,
        amount: razorpayOrderData.amount,
        currency: razorpayOrderData.currency,
        status: razorpayOrderData.status
      });

      // Ensure we got a valid order ID from Razorpay
      if (!razorpayOrderData || !razorpayOrderData.id) {
        console.error('Razorpay order creation failed - no order ID in response:', razorpayOrderData);
        throw new AppError('Failed to create Razorpay order - no order ID received', 500);
      }

      // Create payment event record
      const paymentEvent = await prisma.paymentEvent.create({
        data: {
          userId,
          petId,
          amount,
          currency: currency.toUpperCase(),
          paymentPurpose: purpose as PaymentPurpose,
          status: PaymentStatus.initiated,
          razorpayOrderId: razorpayOrderData.id,
        },
      });

      // Ensure we got a valid payment event ID
      if (!paymentEvent || !paymentEvent.id) {
        console.error('Failed to create payment event record:', paymentEvent);
        throw new AppError('Failed to create payment event record', 500);
      }

      console.log('Payment event created successfully:', {
        paymentEventId: paymentEvent.id,
        razorpayOrderId: paymentEvent.razorpayOrderId,
        userId: paymentEvent.userId,
        status: paymentEvent.status
      });

      const finalResponse = {
        paymentEventId: paymentEvent.id,
        order_id: razorpayOrderData.id.trim(),
        key_id: config.razorpay.keyId,
        amount: Number(razorpayOrderData.amount) / 100, // Convert back to rupees
        currency: razorpayOrderData.currency,
        createdAt: razorpayOrderData.created_at,
      };

      // Final validation - ensure all required fields are present
      if (!finalResponse.order_id || finalResponse.order_id === '') {
        console.error('Order ID validation failed - missing in response:', finalResponse);
        console.error('Original Razorpay order:', razorpayOrderData);
        throw new AppError('Order ID not properly set in response', 500);
      }

      console.log('Payment order creation completed successfully:', finalResponse);
      return finalResponse;
    } catch (error) {
      // Log the error for debugging
      console.error('Error creating payment order:', {
        userId,
        orderData,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Re-throw the error
      throw error;
    }
  }

  static async verifyPayment(paymentEventId: string, verificationData: PaymentVerification) {
    const { razorpayPaymentId, razorpaySignature } = verificationData;

    // Get payment event
    const paymentEvent = await prisma.paymentEvent.findUnique({
      where: { id: paymentEventId },
    });

    if (!paymentEvent) {
      throw new AppError('Payment event not found', 404);
    }

    if (paymentEvent.status !== PaymentStatus.initiated) {
      throw new AppError('Payment already processed or invalid status', 400);
    }

    // Verify signature
    const isValidSignature = CryptoUtil.verifyRazorpaySignature(
      paymentEvent.razorpayOrderId!,
      razorpayPaymentId,
      razorpaySignature,
      config.razorpay.keySecret
    );

    if (!isValidSignature) {
      await prisma.paymentEvent.update({
        where: { id: paymentEventId },
        data: {
          status: PaymentStatus.failed,
          failureReason: 'Invalid signature',
        },
      });
      throw new AppError('Invalid payment signature', 400);
    }

    // Get payment details from Razorpay
    this.validateRazorpayConfig();
    
    const credentials = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json() as RazorpayErrorResponse;
      throw new AppError(
        errorData.error?.description || 'Failed to fetch payment details',
        paymentResponse.status
      );
    }

    const payment = await paymentResponse.json() as RazorpayPaymentResponse;

    if (payment.status !== 'captured') {
      await prisma.paymentEvent.update({
        where: { id: paymentEventId },
        data: {
          status: PaymentStatus.failed,
          razorpayPaymentId,
          razorpaySignature,
          failureReason: `Payment status: ${payment.status}`,
        },
      });
      throw new AppError('Payment not captured', 400);
    }

    // Update payment event
    const updatedPaymentEvent = await prisma.paymentEvent.update({
      where: { id: paymentEventId },
      data: {
        status: PaymentStatus.success,
        razorpayPaymentId,
        razorpaySignature,
        paymentMethod: payment.method,
        completedAt: new Date(),
      },
    });

    // Process post-payment actions based on purpose
    await this.processPostPaymentActions(updatedPaymentEvent);

    return {
      paymentEvent: updatedPaymentEvent,
      message: 'Payment verified successfully',
    };
  }

  static async handleWebhook(payload: any, signature: string) {
    // Verify webhook signature
    const isValidSignature = CryptoUtil.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
      config.razorpay.webhookSecret
    );

    if (!isValidSignature) {
      throw new AppError('Invalid webhook signature', 400);
    }

    // Store webhook event
    const webhookEvent = await prisma.paymentWebhook.create({
      data: {
        eventId: payload.event,
        eventType: payload.event,
        entityType: payload.payload?.payment?.entity?.entity || 'payment',
        entityId: payload.payload?.payment?.entity?.id || 'unknown',
        payload,
        signature,
        signatureVerified: isValidSignature,
      },
    });

    // Process webhook based on event type
    try {
      await this.processWebhookEvent(payload);
      
      await prisma.paymentWebhook.update({
        where: { id: webhookEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.paymentWebhook.update({
        where: { id: webhookEvent.id },
        data: {
          processingAttempts: { increment: 1 },
        },
      });
      throw error;
    }

    return { message: 'Webhook processed successfully' };
  }

  private static async validatePaymentOrder(userId: string, orderData: PaymentOrder) {
    const { petId, amount, purpose } = orderData;

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404);
    }

    // Validate pet exists and user has access
    if (petId) {
      const pet = await prisma.pet.findUnique({
        where: { id: petId },
        include: { owner: true },
      });

      if (!pet) {
        throw new AppError('Pet not found', 404);
      }

      if (pet.owner.userId !== userId && user.role === 'pet_owner') {
        throw new AppError('Not authorized for this pet', 403);
      }
    }

    // Validate amount
    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount', 400);
    }

    // Validate purpose-specific rules
    if (purpose === 'qr_registration') {
      if (!petId) {
        throw new AppError('Pet ID required for QR registration', 400);
      }

      // Check if pet already has active QR
      const existingQR = await prisma.qRCode.findFirst({
        where: {
          assignedToPet: petId,
          status: 'active',
        },
      });

      if (existingQR) {
        throw new AppError('Pet already has an active QR code', 400);
      }

      // Check for pending payment for the same pet
      const pendingPayment = await prisma.paymentEvent.findFirst({
        where: {
          petId,
          paymentPurpose: 'qr_registration',
          status: 'initiated',
        },
      });

      if (pendingPayment) {
        throw new AppError('Payment already in progress for this pet', 400);
      }
    }
  }

  private static async processPostPaymentActions(paymentEvent: any) {
    switch (paymentEvent.paymentPurpose) {
      case 'qr_registration':
        await this.processQRRegistrationPayment(paymentEvent);
        break;
      case 'premium_features':
        await this.processPremiumFeaturesPayment(paymentEvent);
        break;
      case 'vet_consultation':
        await this.processVetConsultationPayment(paymentEvent);
        break;
      default:
        console.log(`No post-payment actions for purpose: ${paymentEvent.paymentPurpose}`);
    }
  }

  private static async processQRRegistrationPayment(paymentEvent: any) {
    // Get an available QR code
    const availableQR = await prisma.qRCode.findFirst({
      where: { status: 'available' },
      orderBy: { createdAt: 'asc' },
    });

    if (!availableQR) {
      throw new AppError('No QR codes available', 500);
    }

    // Assign QR code to pet
    await prisma.qRCode.update({
      where: { id: availableQR.id },
      data: {
        status: 'assigned',
        assignedToPet: paymentEvent.petId,
        assignedAt: new Date(),
      },
    });

    // Update payment event with QR ID
    await prisma.paymentEvent.update({
      where: { id: paymentEvent.id },
      data: { qrId: availableQR.id },
    });

    // TODO: Send notification to user about successful QR assignment
    console.log(`QR code ${availableQR.qrCodeString} assigned to pet ${paymentEvent.petId}`);
  }

  private static async processPremiumFeaturesPayment(paymentEvent: any) {
    // TODO: Implement premium features activation
    console.log(`Premium features activated for user ${paymentEvent.userId}`);
  }

  private static async processVetConsultationPayment(paymentEvent: any) {
    // TODO: Implement vet consultation booking
    console.log(`Vet consultation booked for user ${paymentEvent.userId}`);
  }

  private static async processWebhookEvent(payload: any) {
    const eventType = payload.event;
    const paymentData = payload.payload?.payment?.entity;

    switch (eventType) {
      case 'payment.captured':
        await this.handlePaymentCaptured(paymentData);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(paymentData);
        break;
      case 'order.paid':
        await this.handleOrderPaid(payload.payload?.order?.entity);
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }
  }

  private static async handlePaymentCaptured(paymentData: any) {
    const paymentEvent = await prisma.paymentEvent.findFirst({
      where: { razorpayPaymentId: paymentData.id },
    });

    if (paymentEvent && paymentEvent.status !== PaymentStatus.success) {
      await prisma.paymentEvent.update({
        where: { id: paymentEvent.id },
        data: {
          status: PaymentStatus.success,
          completedAt: new Date(),
        },
      });
    }
  }

  private static async handlePaymentFailed(paymentData: any) {
    const paymentEvent = await prisma.paymentEvent.findFirst({
      where: { razorpayPaymentId: paymentData.id },
    });

    if (paymentEvent && paymentEvent.status === PaymentStatus.initiated) {
      await prisma.paymentEvent.update({
        where: { id: paymentEvent.id },
        data: {
          status: PaymentStatus.failed,
          failureReason: paymentData.error_description || 'Payment failed',
        },
      });
    }
  }

  private static async handleOrderPaid(orderData: any) {
    const paymentEvent = await prisma.paymentEvent.findFirst({
      where: { razorpayOrderId: orderData.id },
    });

    if (paymentEvent) {
      console.log(`Order ${orderData.id} paid successfully`);
    }
  }

  static async getPaymentHistory(userId: string, page: number = 1, limit: number = 25) {
    const offset = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.paymentEvent.findMany({
        where: { userId },
        include: {
          pet: {
            select: {
              id: true,
              name: true,
            },
          },
          qrCode: {
            select: {
              id: true,
              qrCodeString: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.paymentEvent.count({ where: { userId } }),
    ]);

    const meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    return { payments, meta };
  }

  static async initiateRefund(paymentEventId: string, refundAmount: number, reason: string, initiatedBy: string) {
    const paymentEvent = await prisma.paymentEvent.findUnique({
      where: { id: paymentEventId },
    });

    if (!paymentEvent) {
      throw new AppError('Payment event not found', 404);
    }

    if (paymentEvent.status !== PaymentStatus.success) {
      throw new AppError('Can only refund successful payments', 400);
    }

    if (!paymentEvent.razorpayPaymentId) {
      throw new AppError('Payment ID not found', 400);
    }

    // Create refund in Razorpay
    this.validateRazorpayConfig();
    
    const credentials = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
    const refundData = {
      amount: Math.round(refundAmount * 100),
      notes: {
        reason,
        initiated_by: initiatedBy,
      },
    };

    const refundResponse = await fetch(`https://api.razorpay.com/v1/payments/${paymentEvent.razorpayPaymentId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refundData),
    });

    if (!refundResponse.ok) {
      const errorData = await refundResponse.json() as RazorpayErrorResponse;
      throw new AppError(
        errorData.error?.description || 'Failed to create refund',
        refundResponse.status
      );
    }

    const refund = await refundResponse.json() as RazorpayRefundResponse;

    // Create refund record
    const refundRecord = await prisma.refund.create({
      data: {
        paymentEventId,
        razorpayPaymentId: paymentEvent.razorpayPaymentId,
        razorpayRefundId: refund.id,
        amountInPaise: BigInt(Math.round(refundAmount * 100)),
        refundAmount,
        reason,
        initiatedBy,
        status: 'initiated',
      },
    });

    return refundRecord;
  }

  static async getPublicConfig() {
    this.validateRazorpayConfig();
    
    return {
      key_id: config.razorpay.keyId,
    };
  }
}