# Pet Track Authentication API Flows

## Overview
Pet Track now supports multiple authentication methods:
1. **Phone + OTP Login**
2. **Email + OTP Login** 
3. **Google OAuth Login**
4. **Apple Sign-In Login**

---

## 🔐 Authentication Flow 1: Phone/Email + OTP

### Step 1: Request OTP
**Endpoint:** `POST /api/auth/otp/request`

**Request Body:**
```json
{
  "identifier": "+1234567890", // Phone number or email
  "purpose": "login", // "login" | "registration" | "phone_verification" | "email_verification"
  "deliveryMethod": "phone" // Optional: "phone" | "email" (auto-detected if not provided)
}
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

### Step 2: Verify OTP
**Endpoint:** `POST /api/auth/otp/verify`

**Request Body:**
```json
{
  "identifier": "+1234567890", // Same phone/email used in request
  "otpCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "phone": "+1234567890",
      "firstName": "John",
      "lastName": "Doe",
      "role": "pet_owner",
      "emailVerified": true,
      "phoneVerified": true,
      "profilePicture": null,
      "authProvider": "phone"
    },
    "permissions": ["pets:read", "pets:write", ...]
  },
  "message": "Login successful"
}
```

---

## 🔐 Authentication Flow 2: Google OAuth

### Single Step: Google Login
**Endpoint:** `POST /api/auth/google`

**Request Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..." // Google ID Token from frontend
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@gmail.com",
      "phone": null,
      "firstName": "John",
      "lastName": "Doe",
      "role": "pet_owner",
      "emailVerified": true,
      "phoneVerified": false,
      "profilePicture": "https://lh3.googleusercontent.com/...",
      "authProvider": "google"
    },
    "permissions": ["pets:read", "pets:write", ...],
    "isNewUser": false
  },
  "message": "Google login successful"
}
```

---

## 🔐 Authentication Flow 3: Apple Sign-In

### Single Step: Apple Login
**Endpoint:** `POST /api/auth/apple`

**Request Body:**
```json
{
  "idToken": "eyJraWQiOiJmaDZ..." // Apple ID Token from frontend
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@privaterelay.appleid.com",
      "phone": null,
      "firstName": "Apple",
      "lastName": "User",
      "role": "pet_owner",
      "emailVerified": true,
      "phoneVerified": false,
      "profilePicture": null,
      "authProvider": "apple"
    },
    "permissions": ["pets:read", "pets:write", ...],
    "isNewUser": true
  },
  "message": "Apple login successful"
}
```

---

## 🔄 Token Management

### Refresh Access Token
**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...", // New access token
    "user": { /* user object */ },
    "permissions": ["pets:read", "pets:write", ...]
  }
}
```

### Logout
**Endpoint:** `POST /api/auth/logout`
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Logout All Sessions
**Endpoint:** `POST /api/auth/logout-all`
**Headers:** `Authorization: Bearer <accessToken>`

---

## 📱 Frontend Integration Guide

### Phone/Email OTP Flow
```javascript
// Step 1: Request OTP
const requestOTP = async (identifier, purpose = 'login') => {
  const response = await fetch('/api/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, purpose })
  });
  return response.json();
};

// Step 2: Verify OTP
const verifyOTP = async (identifier, otpCode) => {
  const response = await fetch('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, otpCode })
  });
  return response.json();
};
```

### Google OAuth Flow
```javascript
// Using Google Sign-In SDK
const googleLogin = async (googleIdToken) => {
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: googleIdToken })
  });
  return response.json();
};

// Google Sign-In button handler
const handleGoogleSignIn = async (credentialResponse) => {
  try {
    const result = await googleLogin(credentialResponse.credential);
    if (result.success) {
      // Store tokens and redirect user
      localStorage.setItem('accessToken', result.data.accessToken);
      localStorage.setItem('refreshToken', result.data.refreshToken);
    }
  } catch (error) {
    console.error('Google login failed:', error);
  }
};
```

### Apple Sign-In Flow
```javascript
// Using Apple Sign-In SDK
const appleLogin = async (appleIdToken) => {
  const response = await fetch('/api/auth/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: appleIdToken })
  });
  return response.json();
};

// Apple Sign-In button handler
const handleAppleSignIn = async (response) => {
  try {
    const result = await appleLogin(response.authorization.id_token);
    if (result.success) {
      // Store tokens and redirect user
      localStorage.setItem('accessToken', result.data.accessToken);
      localStorage.setItem('refreshToken', result.data.refreshToken);
    }
  } catch (error) {
    console.error('Apple login failed:', error);
  }
};
```

---

## 🔧 Environment Variables Required

Add these to your `.env` file:

```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
APPLE_CLIENT_ID=your_apple_client_id

# Email Configuration (for email OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SMS Configuration (for phone OTP) - Already configured
SMS_API_KEY=your_twilio_account_sid
SMS_API_SECRET=your_twilio_auth_token
SMS_SENDER_ID=your_sender_id
```

---

## 🚀 Features Implemented

✅ **Phone OTP Authentication** - SMS via Twilio  
✅ **Email OTP Authentication** - Email via Nodemailer  
✅ **Google OAuth Login** - ID token verification  
✅ **Apple Sign-In Login** - ID token verification  
✅ **Social Login Auto-Registration** - Creates user automatically  
✅ **Profile Picture Support** - From Google/Apple  
✅ **Multi-Provider Accounts** - Link Google/Apple to existing accounts  
✅ **Welcome Emails** - Sent to new social login users  
✅ **Enhanced User Model** - Social login fields in database  
✅ **Rate Limiting** - Prevents abuse on all endpoints  
✅ **Comprehensive Error Handling** - Proper error messages  

Your complete authentication system is now ready! 🎉