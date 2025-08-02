#!/bin/bash

# Pet Track API Test Script
echo "🚀 Pet Track API Test Script"
echo "=============================="

API_BASE="http://localhost:3000/api/v1"

# Health check
echo "🏥 Testing health check..."
curl -s -X GET "$API_BASE/../health" | jq . || echo "❌ Health check failed"
echo ""

# Test OTP request
echo "📱 Testing OTP request..."
curl -s -X POST "$API_BASE/auth/otp/request" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+911234567890",
    "purpose": "login"
  }' | jq . || echo "❌ OTP request failed"
echo ""

# Test pet species endpoint
echo "🐕 Testing pet species endpoint..."
curl -s -X GET "$API_BASE/pets/species-breeds" | jq . || echo "❌ Species request failed"
echo ""

# Test QR scan (public endpoint)
echo "🔗 Testing QR scan endpoint..."
curl -s -X GET "$API_BASE/qr/PET_123_TEST/scan" | jq . || echo "❌ QR scan failed"
echo ""

echo "✅ API test script completed!"
echo "Note: Make sure the server is running on port 3000"