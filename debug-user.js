const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugUser() {
  const userId = 'd17de156-03a9-41f5-a4d5-fe7424e1b234';
  
  try {
    console.log('🔍 Checking database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Look for the specific user
    console.log(`\n🔍 Looking for user: ${userId}`);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        petOwner: {
          select: {
            id: true,
            createdAt: true
          }
        }
      },
    });
    
    if (user) {
      console.log('✅ User found:', JSON.stringify(user, null, 2));
      
      if (!user.isActive) {
        console.log('❌ User is INACTIVE!');
      }
      
      if (!user.petOwner) {
        console.log('❌ User has NO PetOwner profile!');
      }
    } else {
      console.log('❌ User NOT FOUND in database');
      
      // Let's see what users exist
      console.log('\n🔍 Checking first 5 users in database:');
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          role: true,
          isActive: true
        }
      });
      console.log('Users:', JSON.stringify(users, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugUser();