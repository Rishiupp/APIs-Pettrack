import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Testing Firebase Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Missing');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✓ Set' : '✗ Missing');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✓ Set (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : '✗ Missing');

try {
  // Initialize Firebase Admin
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    
    console.log('\nInitializing Firebase Admin SDK...');
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    
    console.log('✓ Firebase initialized successfully');
    
    // Test messaging service
    console.log('\nTesting Firebase Messaging service...');
    const messaging = admin.messaging();
    console.log('✓ Messaging service accessible');
    
    // Try to send a test message to a dummy token (will fail but shows if service works)
    try {
      await messaging.send({
        notification: {
          title: 'Test',
          body: 'Test message'
        },
        token: 'dummy-token'
      });
    } catch (err) {
      if (err.code === 'messaging/invalid-argument' || err.code === 'messaging/registration-token-not-registered') {
        console.log('✓ Messaging service is working (expected error with dummy token)');
      } else {
        console.log('✗ Messaging error:', err.message);
      }
    }
    
  }
} catch (error) {
  console.log('✗ Firebase initialization failed:');
  console.log('Error code:', error.code);
  console.log('Error message:', error.message);
  
  if (error.message.includes('private_key')) {
    console.log('\n🔍 Private key format issue detected');
    console.log('First 50 chars of private key:', process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50));
  }
}

process.exit(0);