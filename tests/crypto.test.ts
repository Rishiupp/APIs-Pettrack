import { CryptoUtil } from '../src/utils/crypto';
import crypto from 'crypto';

describe('CryptoUtil - Signature Verification', () => {
  const testSecret = 'test_secret_key_12345';
  
  describe('verifyRazorpaySignature', () => {
    it('should verify valid checkout signature', () => {
      // Test vector with known good values
      const orderId = 'order_ABCxyz123';
      const paymentId = 'pay_XYZ789abc';
      
      // Generate expected signature
      const body = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(body)
        .digest('hex');
      
      const result = CryptoUtil.verifyRazorpaySignature(
        orderId,
        paymentId,
        expectedSignature,
        testSecret
      );
      
      expect(result).toBe(true);
    });

    it('should reject signature with wrong secret', () => {
      const orderId = 'order_ABCxyz123';
      const paymentId = 'pay_XYZ789abc';
      const wrongSecret = 'wrong_secret';
      
      const body = `${orderId}|${paymentId}`;
      const signatureWithWrongSecret = crypto
        .createHmac('sha256', wrongSecret)
        .update(body)
        .digest('hex');
      
      const result = CryptoUtil.verifyRazorpaySignature(
        orderId,
        paymentId,
        signatureWithWrongSecret,
        testSecret
      );
      
      expect(result).toBe(false);
    });

    it('should reject signature with altered payload', () => {
      const orderId = 'order_ABCxyz123';
      const paymentId = 'pay_XYZ789abc';
      const alteredPaymentId = 'pay_ALTERED456';
      
      // Create signature with original payment ID
      const originalBody = `${orderId}|${paymentId}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(originalBody)
        .digest('hex');
      
      // Verify with altered payment ID should fail
      const result = CryptoUtil.verifyRazorpaySignature(
        orderId,
        alteredPaymentId,
        signature,
        testSecret
      );
      
      expect(result).toBe(false);
    });

    it('should handle edge cases with unicode characters', () => {
      const orderId = 'order_测试123';
      const paymentId = 'pay_ñíçø∂é';
      
      const body = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(body, 'utf8')
        .digest('hex');
      
      const result = CryptoUtil.verifyRazorpaySignature(
        orderId,
        paymentId,
        expectedSignature,
        testSecret
      );
      
      expect(result).toBe(true);
    });

    it('should handle very large IDs', () => {
      const orderId = 'order_' + 'A'.repeat(100);
      const paymentId = 'pay_' + 'B'.repeat(100);
      
      const body = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(body)
        .digest('hex');
      
      const result = CryptoUtil.verifyRazorpaySignature(
        orderId,
        paymentId,
        expectedSignature,
        testSecret
      );
      
      expect(result).toBe(true);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature with raw body', () => {
      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_123',
              amount: 50000,
              status: 'captured'
            }
          }
        }
      });
      
      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(webhookPayload)
        .digest('hex');
      
      const result = CryptoUtil.verifyWebhookSignature(
        webhookPayload,
        expectedSignature,
        testSecret
      );
      
      expect(result).toBe(true);
    });

    it('should reject webhook signature with wrong secret', () => {
      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_123' } } }
      });
      
      const wrongSecret = 'wrong_webhook_secret';
      const signatureWithWrongSecret = crypto
        .createHmac('sha256', wrongSecret)
        .update(webhookPayload)
        .digest('hex');
      
      const result = CryptoUtil.verifyWebhookSignature(
        webhookPayload,
        signatureWithWrongSecret,
        testSecret
      );
      
      expect(result).toBe(false);
    });

    it('should reject signature when body is altered', () => {
      const originalPayload = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_123' } } }
      });
      
      const alteredPayload = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_ALTERED' } } }
      });
      
      // Create signature with original payload
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(originalPayload)
        .digest('hex');
      
      // Verify with altered payload should fail
      const result = CryptoUtil.verifyWebhookSignature(
        alteredPayload,
        signature,
        testSecret
      );
      
      expect(result).toBe(false);
    });

    it('should be sensitive to whitespace changes in JSON', () => {
      const payload1 = '{"event":"payment.captured","amount":50000}';
      const payload2 = '{"event": "payment.captured", "amount": 50000}'; // Added spaces
      
      const signature1 = crypto
        .createHmac('sha256', testSecret)
        .update(payload1)
        .digest('hex');
      
      // Same signature should not work for payload with different whitespace
      const result = CryptoUtil.verifyWebhookSignature(
        payload2,
        signature1,
        testSecret
      );
      
      expect(result).toBe(false);
    });

    it('should handle empty webhook payload', () => {
      const emptyPayload = '';
      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(emptyPayload)
        .digest('hex');
      
      const result = CryptoUtil.verifyWebhookSignature(
        emptyPayload,
        expectedSignature,
        testSecret
      );
      
      expect(result).toBe(true);
    });
  });

  describe('signature verification edge cases', () => {
    it('should handle empty string signatures', () => {
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      
      const result = CryptoUtil.verifyRazorpaySignature(
        orderId,
        paymentId,
        '',
        testSecret
      );
      
      expect(result).toBe(false);
    });

    it('should handle null/undefined signatures', () => {
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      
      expect(() => {
        CryptoUtil.verifyRazorpaySignature(
          orderId,
          paymentId,
          null as any,
          testSecret
        );
      }).toThrow();
    });

    it('should be case sensitive for signature comparison', () => {
      const orderId = 'order_ABCxyz123';
      const paymentId = 'pay_XYZ789abc';
      
      const body = `${orderId}|${paymentId}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(body)
        .digest('hex');
      
      // Convert to uppercase - should fail
      const uppercaseSignature = signature.toUpperCase();
      
      const result = CryptoUtil.verifyRazorpaySignature(
        orderId,
        paymentId,
        uppercaseSignature,
        testSecret
      );
      
      expect(result).toBe(false);
    });
  });
});