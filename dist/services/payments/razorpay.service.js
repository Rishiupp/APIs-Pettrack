"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayService = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const crypto_1 = require("../../utils/crypto");
const types_1 = require("../../types");
const config_1 = require("../../config");
class RazorpayService {
    static async createPaymentOrder(userId, orderData) {
        const { petId, amount, currency, purpose } = orderData;
        await this.validatePaymentOrder(userId, orderData);
        const razorpayOrder = await this.razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: currency.toUpperCase(),
            notes: {
                petId,
                userId,
                purpose,
            },
        });
        const paymentEvent = await database_1.default.paymentEvent.create({
            data: {
                userId,
                petId,
                amount,
                currency: currency.toUpperCase(),
                paymentPurpose: purpose,
                status: client_1.PaymentStatus.initiated,
                razorpayOrderId: razorpayOrder.id,
            },
        });
        return {
            paymentEventId: paymentEvent.id,
            razorpayOrderId: razorpayOrder.id,
            amount: Number(razorpayOrder.amount) / 100,
            currency: razorpayOrder.currency,
            createdAt: razorpayOrder.created_at,
        };
    }
    static async verifyPayment(paymentEventId, verificationData) {
        const { razorpayPaymentId, razorpaySignature } = verificationData;
        const paymentEvent = await database_1.default.paymentEvent.findUnique({
            where: { id: paymentEventId },
        });
        if (!paymentEvent) {
            throw new types_1.AppError('Payment event not found', 404);
        }
        if (paymentEvent.status !== client_1.PaymentStatus.initiated) {
            throw new types_1.AppError('Payment already processed or invalid status', 400);
        }
        const isValidSignature = crypto_1.CryptoUtil.verifyRazorpaySignature(paymentEvent.razorpayOrderId, razorpayPaymentId, razorpaySignature, config_1.config.razorpay.keySecret);
        if (!isValidSignature) {
            await database_1.default.paymentEvent.update({
                where: { id: paymentEventId },
                data: {
                    status: client_1.PaymentStatus.failed,
                    failureReason: 'Invalid signature',
                },
            });
            throw new types_1.AppError('Invalid payment signature', 400);
        }
        const payment = await this.razorpay.payments.fetch(razorpayPaymentId);
        if (payment.status !== 'captured') {
            await database_1.default.paymentEvent.update({
                where: { id: paymentEventId },
                data: {
                    status: client_1.PaymentStatus.failed,
                    razorpayPaymentId,
                    razorpaySignature,
                    failureReason: `Payment status: ${payment.status}`,
                },
            });
            throw new types_1.AppError('Payment not captured', 400);
        }
        const updatedPaymentEvent = await database_1.default.paymentEvent.update({
            where: { id: paymentEventId },
            data: {
                status: client_1.PaymentStatus.success,
                razorpayPaymentId,
                razorpaySignature,
                paymentMethod: payment.method,
                completedAt: new Date(),
            },
        });
        await this.processPostPaymentActions(updatedPaymentEvent);
        return {
            paymentEvent: updatedPaymentEvent,
            message: 'Payment verified successfully',
        };
    }
    static async handleWebhook(payload, signature) {
        const isValidSignature = crypto_1.CryptoUtil.verifyWebhookSignature(JSON.stringify(payload), signature, config_1.config.razorpay.webhookSecret);
        if (!isValidSignature) {
            throw new types_1.AppError('Invalid webhook signature', 400);
        }
        const webhookEvent = await database_1.default.paymentWebhook.create({
            data: {
                eventId: payload.event,
                eventType: payload.event,
                entityType: payload.payload?.payment?.entity || 'unknown',
                entityId: payload.payload?.payment?.entity?.id || 'unknown',
                payload,
                signature,
                signatureVerified: isValidSignature,
            },
        });
        try {
            await this.processWebhookEvent(payload);
            await database_1.default.paymentWebhook.update({
                where: { id: webhookEvent.id },
                data: {
                    processed: true,
                    processedAt: new Date(),
                },
            });
        }
        catch (error) {
            await database_1.default.paymentWebhook.update({
                where: { id: webhookEvent.id },
                data: {
                    processingAttempts: { increment: 1 },
                },
            });
            throw error;
        }
        return { message: 'Webhook processed successfully' };
    }
    static async validatePaymentOrder(userId, orderData) {
        const { petId, amount, purpose } = orderData;
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.isActive) {
            throw new types_1.AppError('User not found or inactive', 404);
        }
        if (petId) {
            const pet = await database_1.default.pet.findUnique({
                where: { id: petId },
                include: { owner: true },
            });
            if (!pet) {
                throw new types_1.AppError('Pet not found', 404);
            }
            if (pet.owner.userId !== userId && user.role === 'pet_owner') {
                throw new types_1.AppError('Not authorized for this pet', 403);
            }
        }
        if (!amount || amount <= 0) {
            throw new types_1.AppError('Invalid amount', 400);
        }
        if (purpose === 'qr_registration') {
            if (!petId) {
                throw new types_1.AppError('Pet ID required for QR registration', 400);
            }
            const existingQR = await database_1.default.qRCode.findFirst({
                where: {
                    assignedToPet: petId,
                    status: 'active',
                },
            });
            if (existingQR) {
                throw new types_1.AppError('Pet already has an active QR code', 400);
            }
            const pendingPayment = await database_1.default.paymentEvent.findFirst({
                where: {
                    petId,
                    paymentPurpose: 'qr_registration',
                    status: 'initiated',
                },
            });
            if (pendingPayment) {
                throw new types_1.AppError('Payment already in progress for this pet', 400);
            }
        }
    }
    static async processPostPaymentActions(paymentEvent) {
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
    static async processQRRegistrationPayment(paymentEvent) {
        const availableQR = await database_1.default.qRCode.findFirst({
            where: { status: 'available' },
            orderBy: { createdAt: 'asc' },
        });
        if (!availableQR) {
            throw new types_1.AppError('No QR codes available', 500);
        }
        await database_1.default.qRCode.update({
            where: { id: availableQR.id },
            data: {
                status: 'assigned',
                assignedToPet: paymentEvent.petId,
                assignedAt: new Date(),
            },
        });
        await database_1.default.paymentEvent.update({
            where: { id: paymentEvent.id },
            data: { qrId: availableQR.id },
        });
        console.log(`QR code ${availableQR.qrCodeString} assigned to pet ${paymentEvent.petId}`);
    }
    static async processPremiumFeaturesPayment(paymentEvent) {
        console.log(`Premium features activated for user ${paymentEvent.userId}`);
    }
    static async processVetConsultationPayment(paymentEvent) {
        console.log(`Vet consultation booked for user ${paymentEvent.userId}`);
    }
    static async processWebhookEvent(payload) {
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
    static async handlePaymentCaptured(paymentData) {
        const paymentEvent = await database_1.default.paymentEvent.findFirst({
            where: { razorpayPaymentId: paymentData.id },
        });
        if (paymentEvent && paymentEvent.status !== client_1.PaymentStatus.success) {
            await database_1.default.paymentEvent.update({
                where: { id: paymentEvent.id },
                data: {
                    status: client_1.PaymentStatus.success,
                    completedAt: new Date(),
                },
            });
        }
    }
    static async handlePaymentFailed(paymentData) {
        const paymentEvent = await database_1.default.paymentEvent.findFirst({
            where: { razorpayPaymentId: paymentData.id },
        });
        if (paymentEvent && paymentEvent.status === client_1.PaymentStatus.initiated) {
            await database_1.default.paymentEvent.update({
                where: { id: paymentEvent.id },
                data: {
                    status: client_1.PaymentStatus.failed,
                    failureReason: paymentData.error_description || 'Payment failed',
                },
            });
        }
    }
    static async handleOrderPaid(orderData) {
        const paymentEvent = await database_1.default.paymentEvent.findFirst({
            where: { razorpayOrderId: orderData.id },
        });
        if (paymentEvent) {
            console.log(`Order ${orderData.id} paid successfully`);
        }
    }
    static async getPaymentHistory(userId, page = 1, limit = 25) {
        const offset = (page - 1) * limit;
        const [payments, total] = await Promise.all([
            database_1.default.paymentEvent.findMany({
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
            database_1.default.paymentEvent.count({ where: { userId } }),
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
    static async initiateRefund(paymentEventId, refundAmount, reason, initiatedBy) {
        const paymentEvent = await database_1.default.paymentEvent.findUnique({
            where: { id: paymentEventId },
        });
        if (!paymentEvent) {
            throw new types_1.AppError('Payment event not found', 404);
        }
        if (paymentEvent.status !== client_1.PaymentStatus.success) {
            throw new types_1.AppError('Can only refund successful payments', 400);
        }
        if (!paymentEvent.razorpayPaymentId) {
            throw new types_1.AppError('Payment ID not found', 400);
        }
        const refund = await this.razorpay.payments.refund(paymentEvent.razorpayPaymentId, {
            amount: Math.round(refundAmount * 100),
            notes: {
                reason,
                initiated_by: initiatedBy,
            },
        });
        const refundRecord = await database_1.default.refund.create({
            data: {
                paymentEventId,
                razorpayRefundId: refund.id,
                refundAmount,
                reason,
                initiatedBy,
                status: 'initiated',
            },
        });
        return refundRecord;
    }
}
exports.RazorpayService = RazorpayService;
RazorpayService.razorpay = new razorpay_1.default({
    key_id: config_1.config.razorpay.keyId,
    key_secret: config_1.config.razorpay.keySecret,
});
//# sourceMappingURL=razorpay.service.js.map