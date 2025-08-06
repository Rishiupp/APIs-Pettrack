const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUser() {
  const userId = 'd17de156-03a9-41f5-a4d5-fe7424e1b234';
  
  try {
    console.log('🔧 Fixing user issues...');
    
    // Step 1: Activate the user
    console.log('1️⃣ Activating user...');
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });
    console.log('✅ User activated:', updatedUser);
    
    // Step 2: Create PetOwner profile
    console.log('\n2️⃣ Creating PetOwner profile...');
    const petOwner = await prisma.petOwner.create({
      data: {
        userId: userId,
        countryCode: 'IN' // Default as per schema
      },
      select: {
        id: true,
        userId: true,
        createdAt: true
      }
    });
    console.log('✅ PetOwner profile created:', petOwner);
    
    // Step 3: Verify the fix
    console.log('\n3️⃣ Verifying the fix...');
    const verifyUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { petOwner: true },
    });
    
    if (verifyUser && verifyUser.isActive && verifyUser.petOwner) {
      console.log('🎉 SUCCESS! User is now active with PetOwner profile');
      console.log('User can now create pets via the API');
    } else {
      console.log('❌ Something went wrong during the fix');
    }
    
  } catch (error) {
    console.error('❌ Error fixing user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixUser();