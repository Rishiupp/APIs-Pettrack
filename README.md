# Pet Track API

A comprehensive pet tracking backend system with QR code integration, built with Node.js, Express, TypeScript, and Prisma.

## Features

✅ **Authentication & Authorization**
- JWT-based authentication with OTP verification
- Role-based access control (Pet Owner, Executive, Admin)
- Secure session management

✅ **Pet Management**
- Complete CRUD operations for pets
- Vaccination records management
- Medical history tracking
- Multi-species support (Dogs, Cats, Birds)

✅ **QR Code System**
- QR code generation and assignment
- Public scanning with location tracking
- Real-time notifications to pet owners

✅ **Payment Integration**
- Razorpay payment gateway integration
- QR registration payments
- Webhook handling for payment events

✅ **Security Features**
- Rate limiting
- Input validation and sanitization
- Error handling middleware
- CORS protection

## Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with OTP verification
- **Payments**: Razorpay integration
- **Security**: Helmet, CORS, Rate limiting
- **Validation**: Express Validator
- **File Upload**: Multer
- **QR Generation**: QRCode library

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Razorpay account (for payments)
- Firebase account (for push notifications)

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd petTrack
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Set up the database**
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with initial data
npm run prisma:seed
```

4. **Start the development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/pettrack"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRE_TIME="15m"
JWT_REFRESH_EXPIRE_TIME="7d"

# Razorpay (use test keys for development)
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_test_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"

# Firebase (for push notifications)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Other configurations...
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/otp/request` - Request OTP
- `POST /api/v1/auth/otp/verify` - Verify OTP and login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/profile` - Get user profile

### Pet Management
- `POST /api/v1/pets` - Create new pet
- `GET /api/v1/pets` - Get user's pets
- `GET /api/v1/pets/:petId` - Get pet details
- `PATCH /api/v1/pets/:petId` - Update pet
- `DELETE /api/v1/pets/:petId` - Delete pet
- `POST /api/v1/pets/:petId/vaccinations` - Add vaccination records
- `GET /api/v1/pets/:petId/vaccinations` - Get pet vaccinations

### QR Code Management
- `GET /api/v1/qr/:qrCodeString/scan` - Scan QR code (public)
- `GET /api/v1/qr/available` - Get available QR codes
- `POST /api/v1/qr/pets/:petId/assign` - Assign QR to pet
- `GET /api/v1/qr/pets/:petId/codes` - Get pet's QR codes
- `GET /api/v1/qr/pets/:petId/scans` - Get scan history

### Payments
- `POST /api/v1/payments/create-order` - Create payment order
- `POST /api/v1/payments/:paymentEventId/verify` - Verify payment
- `POST /api/v1/payments/webhook/razorpay` - Razorpay webhook
- `GET /api/v1/payments` - Get payment history

### Admin (Admin only)
- `GET /api/v1/admin/dashboard/overview` - Dashboard overview
- `GET /api/v1/admin/analytics/pets` - Pet analytics
- `POST /api/v1/admin/qr-codes/pools` - Create QR pool
- `POST /api/v1/admin/qr-codes/generate` - Generate QR codes

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key entities include:

- **Users** - User accounts with role-based access
- **Pets** - Pet profiles with species, breed, and medical info
- **QR Codes** - QR code management and tracking
- **Payment Events** - Payment transaction records
- **Scan Events** - QR code scan tracking with location data
- **Notifications** - User notification preferences and history

## Demo Accounts

After running the seed script, you'll have these demo accounts:

- **Admin**: admin@pettrack.com
- **Executive**: executive@pettrack.com  
- **Pet Owner**: demo@pettrack.com

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run prisma:studio # Open Prisma Studio
npm run db:setup     # Complete database setup
npm run prisma:reset # Reset database (destructive)
```

### Database Management

```bash
# Generate Prisma client
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate

# View database in browser
npm run prisma:studio

# Seed database with sample data
npm run prisma:seed
```

## API Testing

### Using curl

1. **Register a new user**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+911234567890",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "otpCode": "123456"
  }'
```

2. **Request OTP**
```bash
curl -X POST http://localhost:3000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+911234567890",
    "purpose": "login"
  }'
```

3. **Create a pet**
```bash
curl -X POST http://localhost:3000/api/v1/pets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Buddy",
    "speciesId": 1,
    "breedId": 1,
    "gender": "male",
    "birthDate": "2020-01-15",
    "color": "Golden"
  }'
```

## Production Deployment

1. **Build the application**
```bash
npm run build
```

2. **Set production environment variables**
```bash
export NODE_ENV=production
export DATABASE_URL="your-production-database-url"
# Set other production variables...
```

3. **Deploy database migrations**
```bash
npm run prisma:deploy
```

4. **Start the production server**
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Support

For support and questions, please create an issue in the repository.# APIs-Pettrack
