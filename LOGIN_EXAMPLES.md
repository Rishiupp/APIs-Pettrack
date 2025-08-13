# Pet Track - Enhanced Login Examples

## Overview
The Pet Track application now supports login with both **phone number** and **email** using OTP verification.

## New Login Flow Examples

### Example 1: Login with Phone Number

**Step 1: Request OTP for Phone**
```bash
curl -X POST http://localhost:3000/api/auth/login/otp/request \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+919876543210",
    "deliveryMethod": "phone"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 300,
    "deliveryMethod": "phone"
  }
}
```

**Step 2: Verify OTP**
```bash
curl -X POST http://localhost:3000/api/auth/login/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+919876543210",
    "otpCode": "123456"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "phone": "+919876543210",
      "firstName": "John",
      "lastName": "Doe",
      "role": "pet_owner",
      "emailVerified": true,
      "phoneVerified": true
    },
    "redirectTo": "/home"
  },
  "message": "Login successful"
}
```

### Example 2: Login with Email

**Step 1: Request OTP for Email**
```bash
curl -X POST http://localhost:3000/api/auth/login/otp/request \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "deliveryMethod": "email"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 300,
    "deliveryMethod": "email"
  }
}
```

**Step 2: Verify OTP**
```bash
curl -X POST http://localhost:3000/api/auth/login/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "otpCode": "654321"
  }'
```

### Example 3: Auto-detect Delivery Method

**Request OTP (auto-detect based on identifier format):**
```bash
# For phone number (auto-detects as SMS)
curl -X POST http://localhost:3000/api/auth/login/otp/request \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+919876543210"
  }'

# For email (auto-detects as email)
curl -X POST http://localhost:3000/api/auth/login/otp/request \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com"
  }'
```

## Registration Examples

### Registration with Both Phone and Email

**Step 1: Request OTP for Registration**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

**Step 2: Complete Registration**
```bash
curl -X POST http://localhost:3000/api/auth/register/complete \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "otpCode": "789012"
  }'
```

## Frontend Integration Example

```javascript
// Enhanced login component
class LoginComponent {
  async requestOTP(identifier) {
    try {
      const response = await fetch('/api/auth/login/otp/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`OTP sent via ${result.data.deliveryMethod}`);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to send OTP:', error);
      throw error;
    }
  }

  async verifyOTP(identifier, otpCode) {
    try {
      const response = await fetch('/api/auth/login/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, otpCode })
      });

      const result = await response.json();
      
      if (result.success) {
        // Store tokens
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        
        // Redirect to home
        window.location.href = result.data.redirectTo;
        
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      throw error;
    }
  }

  // Handle form submission
  handleLogin = async (event) => {
    event.preventDefault();
    const identifier = event.target.identifier.value;
    
    try {
      // Request OTP
      await this.requestOTP(identifier);
      
      // Show OTP input form
      this.showOTPForm();
      
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleOTPVerification = async (event) => {
    event.preventDefault();
    const identifier = this.state.identifier;
    const otpCode = event.target.otpCode.value;
    
    try {
      await this.verifyOTP(identifier, otpCode);
    } catch (error) {
      this.showError(error.message);
    }
  }
}
```

## Key Features Implemented

✅ **Flexible Login**: Users can login with either phone number or email  
✅ **Auto-detection**: System automatically detects whether to send SMS or email OTP  
✅ **Manual Override**: Users can specify preferred delivery method  
✅ **Backward Compatibility**: Legacy endpoints still work  
✅ **Enhanced Registration**: Collects both phone and email during registration  
✅ **Unified Verification**: Single OTP verification flow for both login methods  
✅ **Email Templates**: Beautiful HTML email templates for OTP delivery  
✅ **Rate Limiting**: Protection against OTP spam  
✅ **Comprehensive Validation**: Proper validation for both phone and email formats  

## Testing the Implementation

1. **Start the server**: `npm run dev`
2. **Test phone login**: Use the curl examples above with a valid phone number
3. **Test email login**: Use the curl examples above with a valid email address
4. **Check logs**: OTP codes will be logged to console for testing
5. **Verify database**: Check that OTP records are created with correct delivery method

The implementation is now complete and ready for production use! 🚀