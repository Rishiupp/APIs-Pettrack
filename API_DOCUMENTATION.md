
# PetTrack API Documentation

## Authentication Endpoints

### Base URL
```
http://localhost:5000/auth
```

---

## Registration Flow

### 1. Request Registration OTP

**Endpoint:** `POST /auth/register`

**Description:** Initiates user registration by sending OTP to both phone and email

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "phone": "+1234567890",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Registration initiated. Please verify OTP to complete registration.",
  "phone": "+1234567890",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "expiresIn": 300,
  "deliveryMethods": ["phone", "email"]
}
```

**Validation Error Response (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Invalid phone number format"
    },
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details"
}
```

---

### 2. Complete Registration

**Endpoint:** `POST /auth/register/complete`

**Description:** Completes registration by verifying OTP and creating user account

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "phone": "+1234567890",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "otpCode": "123456"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration completed successfully",
  "user": {
    "id": "clx123abc456",
    "email": "user@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "role": "pet_owner",
    "emailVerified": false,
    "phoneVerified": true,
    "profilePicture": null,
    "authProvider": "local",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "redirectTo": "/login"
}
```

**Validation Error Response (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "otpCode",
      "message": "OTP code is required and must be 6 digits"
    }
  ]
}
```

**OTP Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

---

## Login Flow

### 1. Request Login OTP

**Endpoint:** `POST /auth/login/otp/request`

**Description:** Requests OTP for login using phone number or email

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body (Phone):**
```json
{
  "identifier": "+1234567890",
  "deliveryMethod": "phone"
}
```

**Request Body (Email):**
```json
{
  "identifier": "user@example.com",
  "deliveryMethod": "email"
}
```

**Request Body (Auto-detect):**
```json
{
  "identifier": "+1234567890"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent to phone",
  "expiresIn": 300,
  "deliveryMethods": ["phone"],
  "maskedIdentifier": "+123****890"
}
```

**User Not Found Response (404):**
```json
{
  "success": false,
  "message": "User not found with this phone/email"
}
```

**Rate Limit Response (429):**
```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

---

### 2. Verify Login OTP

**Endpoint:** `POST /auth/login/otp/verify`

**Description:** Verifies OTP and completes login process

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "identifier": "+1234567890",
  "otpCode": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbHgxMjNhYmM0NTYiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoicGV0X293bmVyIiwiaWF0IjoxNjQyNjgwMDAwLCJleHAiOjE2NDI2ODM2MDB9.signature",
  "refreshToken": "refresh_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
  "user": {
    "id": "clx123abc456",
    "email": "user@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "role": "pet_owner",
    "emailVerified": true,
    "phoneVerified": true,
    "profilePicture": null,
    "authProvider": "local",
    "lastLoginAt": "2025-01-15T10:30:00.000Z",
    "petOwner": {
      "id": "clx123pet456",
      "pets": []
    }
  },
  "permissions": ["read:profile", "write:pets", "read:pets"],
  "redirectTo": "/home"
}
```

**Invalid OTP Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**Account Locked Response (423):**
```json
{
  "success": false,
  "message": "Account temporarily locked due to multiple failed attempts"
}
```

---

## OAuth Login

### Google Login

**Endpoint:** `POST /auth/google`

**Description:** Authenticate using Google OAuth ID token

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "idToken": "google_oauth_id_token_here_very_long_jwt_string"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Google login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "clx123abc456",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "pet_owner",
    "emailVerified": true,
    "phoneVerified": false,
    "profilePicture": "https://lh3.googleusercontent.com/a/profile_pic_url",
    "authProvider": "google",
    "googleId": "google_user_id_123456"
  },
  "permissions": ["read:profile", "write:pets"],
  "isNewUser": false
}
```

---

### Apple Login

**Endpoint:** `POST /auth/apple`

**Description:** Authenticate using Apple Sign-In ID token

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "idToken": "apple_signin_id_token_here_very_long_jwt_string"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Apple login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "clx123abc456",
    "email": "user@privaterelay.appleid.com",
    "firstName": "Apple",
    "lastName": "User",
    "role": "pet_owner",
    "emailVerified": true,
    "phoneVerified": false,
    "profilePicture": null,
    "authProvider": "apple",
    "appleId": "apple_user_id_123456"
  },
  "permissions": ["read:profile", "write:pets"],
  "isNewUser": true
}
```

---

## Token Management

### Refresh Access Token

**Endpoint:** `POST /auth/refresh`

**Description:** Refresh access token using refresh token

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "refreshToken": "refresh_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx123abc456",
    "email": "user@example.com",
    "role": "pet_owner"
  },
  "permissions": ["read:profile", "write:pets"]
}
```

---

### Logout

**Endpoint:** `POST /auth/logout`

**Description:** Logout from current session

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Request Body:**
```json
{
  "refreshToken": "refresh_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
}
```

**Success Response (204):**
```
No Content
```

---

### Logout All Sessions

**Endpoint:** `POST /auth/logout-all`

**Description:** Logout from all sessions across all devices

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (204):**
```
No Content
```

---

## User Profile

### Get User Profile

**Endpoint:** `GET /auth/profile`

**Description:** Get authenticated user's profile information

**Headers:**
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "clx123abc456",
    "email": "user@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "role": "pet_owner",
    "emailVerified": true,
    "phoneVerified": true,
    "profilePicture": null,
    "authProvider": "local",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "lastLoginAt": "2025-01-15T10:30:00.000Z",
    "petOwner": {
      "id": "clx123pet456",
      "pets": [
        {
          "id": "clx123pet789",
          "name": "Buddy",
          "species": "dog",
          "breed": "Golden Retriever"
        }
      ]
    }
  }
}
```

---

## Legacy Endpoints (Backward Compatibility)

### Request OTP (Legacy)

**Endpoint:** `POST /auth/otp/request`

**Request Body:**
```json
{
  "identifier": "+1234567890",
  "purpose": "login",
  "deliveryMethod": "phone"
}
```

### Verify OTP (Legacy)

**Endpoint:** `POST /auth/otp/verify`

**Request Body:**
```json
{
  "identifier": "+1234567890",
  "otpCode": "123456"
}
```

---

## Validation Rules

### Registration
- **phone**: Required, valid international phone number format (E.164)
- **email**: Required, valid email address format
- **firstName**: Required, non-empty string, max 50 characters
- **lastName**: Required, non-empty string, max 50 characters
- **otpCode**: Required, exactly 6 numeric digits

### Login
- **identifier**: Required, valid phone number or email address
- **otpCode**: Required, exactly 6 numeric digits
- **deliveryMethod**: Optional, must be "phone" or "email"
- **idToken**: Required for OAuth, valid JWT token from provider
- **refreshToken**: Required for token operations, valid refresh token

---

## Rate Limiting

- **Registration OTP**: 6 requests per 2 minutes per phone/email
- **Login OTP**: 6 requests per 2 minutes per phone/email
- **OTP Verification**: 3 attempts per OTP before invalidation
- **OAuth Login**: 10 requests per minute per IP

---

## Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created (Registration completed) |
| 204 | No Content (Logout successful) |
| 400 | Bad Request (Validation error) |
| 401 | Unauthorized (Invalid credentials) |
| 403 | Forbidden (Access denied) |
| 404 | Not Found (User not found) |
| 409 | Conflict (User already exists) |
| 423 | Locked (Account temporarily locked) |
| 429 | Too Many Requests (Rate limited) |
| 500 | Internal Server Error |

---

## Security Features

- OTP expires in 5 minutes (300 seconds)
- Rate limiting on all authentication endpoints
- JWT tokens with short expiration (1 hour for access, 30 days for refresh)
- Secure password hashing (not applicable for OTP-based auth)
- Account lockout after multiple failed attempts
- Input validation and sanitization
- CORS protection
- Request logging for security monitoring