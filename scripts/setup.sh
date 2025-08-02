#!/bin/bash

echo "🚀 Pet Track API Setup Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"

# Check if PostgreSQL is available
print_status "Checking PostgreSQL connection..."
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client not found. Make sure PostgreSQL is installed and running."
fi

# Install dependencies
print_status "Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Create necessary directories
print_status "Creating directories..."
mkdir -p uploads/{profile-images,qr-codes,documents,misc}
mkdir -p logs
mkdir -p temp
print_success "Directories created"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Copying from .env.example..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration before proceeding"
else
    print_success ".env file found"
fi

# Validate environment variables
print_status "Validating environment variables..."
ENV_ERRORS=0

check_env_var() {
    if [ -z "${!1}" ]; then
        print_error "Environment variable $1 is not set"
        ENV_ERRORS=$((ENV_ERRORS + 1))
    fi
}

# Load environment variables
source .env 2>/dev/null || true

# Check critical environment variables
check_env_var "DATABASE_URL"
check_env_var "JWT_SECRET"
check_env_var "RAZORPAY_KEY_ID"
check_env_var "RAZORPAY_KEY_SECRET"

if [ $ENV_ERRORS -gt 0 ]; then
    print_error "$ENV_ERRORS critical environment variables are missing"
    print_warning "Please configure your .env file before proceeding"
    exit 1
fi

print_success "Environment variables validated"

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate
if [ $? -eq 0 ]; then
    print_success "Prisma client generated"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi

# Run database migrations (optional)
read -p "Do you want to run database migrations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Running database migrations..."
    npx prisma migrate dev --name init
    if [ $? -eq 0 ]; then
        print_success "Database migrations completed"
        
        # Ask about seeding
        read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Seeding database..."
            npm run prisma:seed
            if [ $? -eq 0 ]; then
                print_success "Database seeded successfully"
            else
                print_warning "Database seeding failed, but setup can continue"
            fi
        fi
    else
        print_error "Database migration failed"
        exit 1
    fi
fi

# Build the application
print_status "Building application..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Application built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Final success message
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your .env file with production values"
echo "2. Set up your PostgreSQL database"
echo "3. Configure Firebase for push notifications"
echo "4. Set up Razorpay account for payments"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "🏗️ To start the production server:"
echo "   npm start"
echo ""
echo "📊 To open Prisma Studio:"
echo "   npm run prisma:studio"
echo ""
echo "🧪 To test the API:"
echo "   ./scripts/test-api.sh"
echo ""

# Display demo accounts if seeded
if [[ $REPLY =~ ^[Yy]$ ]]; then
echo "👤 Demo Accounts (if database was seeded):"
echo "   Admin: admin@pettrack.com"
echo "   Executive: executive@pettrack.com"
echo "   Pet Owner: demo@pettrack.com"
echo ""
fi

print_success "Pet Track API is ready to use!"