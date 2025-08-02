import { PrismaClient, UserRole, Gender, SizeCategory } from '@prisma/client';
import { CryptoUtil } from '../src/utils/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed Pet Species and Breeds
  console.log('📦 Seeding pet species and breeds...');
  
  const dogSpecies = await prisma.petSpecies.upsert({
    where: { speciesName: 'Dog' },
    update: {},
    create: {
      speciesName: 'Dog',
      category: 'mammal',
    },
  });

  const catSpecies = await prisma.petSpecies.upsert({
    where: { speciesName: 'Cat' },
    update: {},
    create: {
      speciesName: 'Cat',
      category: 'mammal',
    },
  });

  const birdSpecies = await prisma.petSpecies.upsert({
    where: { speciesName: 'Bird' },
    update: {},
    create: {
      speciesName: 'Bird',
      category: 'bird',
    },
  });

  // Dog breeds
  const dogBreeds = [
    { name: 'Labrador Retriever', size: SizeCategory.large, lifespan: 12 },
    { name: 'Golden Retriever', size: SizeCategory.large, lifespan: 12 },
    { name: 'German Shepherd', size: SizeCategory.large, lifespan: 11 },
    { name: 'Bulldog', size: SizeCategory.medium, lifespan: 10 },
    { name: 'Beagle', size: SizeCategory.medium, lifespan: 13 },
    { name: 'Poodle', size: SizeCategory.medium, lifespan: 14 },
    { name: 'Rottweiler', size: SizeCategory.large, lifespan: 10 },
    { name: 'Yorkshire Terrier', size: SizeCategory.small, lifespan: 15 },
    { name: 'Dachshund', size: SizeCategory.small, lifespan: 13 },
    { name: 'Siberian Husky', size: SizeCategory.large, lifespan: 12 },
    { name: 'Chihuahua', size: SizeCategory.toy, lifespan: 16 },
    { name: 'Shih Tzu', size: SizeCategory.small, lifespan: 15 },
    { name: 'Indian Pariah Dog', size: SizeCategory.medium, lifespan: 14 },
    { name: 'Rajapalayam', size: SizeCategory.large, lifespan: 12 },
    { name: 'Mudhol Hound', size: SizeCategory.large, lifespan: 13 },
  ];

  for (const breed of dogBreeds) {
    await prisma.petBreed.upsert({
      where: {
        id: -1, // Use a non-existent ID to force create
      },
      update: {},
      create: {
        breedName: breed.name,
        speciesId: dogSpecies.id,
        sizeCategory: breed.size,
        typicalLifespanYears: breed.lifespan,
      },
    }).catch(() => {
      // Ignore if already exists
      console.log(`Breed ${breed.name} already exists`);
    });
  }

  // Cat breeds
  const catBreeds = [
    { name: 'Persian', lifespan: 15 },
    { name: 'Maine Coon', lifespan: 13 },
    { name: 'British Shorthair', lifespan: 14 },
    { name: 'Siamese', lifespan: 15 },
    { name: 'Ragdoll', lifespan: 13 },
    { name: 'Bengal', lifespan: 14 },
    { name: 'Russian Blue', lifespan: 16 },
    { name: 'Domestic Shorthair', lifespan: 15 },
    { name: 'Domestic Longhair', lifespan: 15 },
  ];

  for (const breed of catBreeds) {
    await prisma.petBreed.upsert({
      where: {
        id: -1, // Use a non-existent ID to force create
      },
      update: {},
      create: {
        breedName: breed.name,
        speciesId: catSpecies.id,
        typicalLifespanYears: breed.lifespan,
      },
    }).catch(() => {
      console.log(`Breed ${breed.name} already exists`);
    });
  }

  // Bird breeds
  const birdBreeds = [
    { name: 'Budgerigar', lifespan: 8 },
    { name: 'Cockatiel', lifespan: 20 },
    { name: 'Lovebird', lifespan: 15 },
    { name: 'Canary', lifespan: 10 },
    { name: 'Parrot', lifespan: 50 },
  ];

  for (const breed of birdBreeds) {
    await prisma.petBreed.upsert({
      where: {
        id: -1, // Use a non-existent ID to force create
      },
      update: {},
      create: {
        breedName: breed.name,
        speciesId: birdSpecies.id,
        typicalLifespanYears: breed.lifespan,
      },
    }).catch(() => {
      console.log(`Breed ${breed.name} already exists`);
    });
  }

  // Seed Vaccine Types
  console.log('💉 Seeding vaccine types...');
  
  const vaccines = [
    {
      name: 'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
      species: [dogSpecies.id],
      duration: 12,
      required: true,
    },
    {
      name: 'Rabies',
      species: [dogSpecies.id, catSpecies.id],
      duration: 36,
      required: true,
    },
    {
      name: 'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
      species: [catSpecies.id],
      duration: 12,
      required: true,
    },
    {
      name: 'Bordetella (Kennel Cough)',
      species: [dogSpecies.id],
      duration: 12,
      required: false,
    },
    {
      name: 'Lyme Disease',
      species: [dogSpecies.id],
      duration: 12,
      required: false,
    },
    {
      name: 'FeLV (Feline Leukemia)',
      species: [catSpecies.id],
      duration: 12,
      required: false,
    },
  ];

  for (const vaccine of vaccines) {
    await prisma.vaccineType.upsert({
      where: { vaccineName: vaccine.name },
      update: {},
      create: {
        vaccineName: vaccine.name,
        speciesApplicability: vaccine.species,
        durationMonths: vaccine.duration,
        isRequiredByLaw: vaccine.required,
      },
    });
  }

  // Seed Admin User
  console.log('👤 Seeding admin user...');
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@pettrack.com' },
    update: {},
    create: {
      email: 'admin@pettrack.com',
      phone: '+911234567890',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.admin,
      isActive: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  // Seed Executive User
  console.log('🏢 Seeding executive user...');
  
  const executiveUser = await prisma.user.upsert({
    where: { email: 'executive@pettrack.com' },
    update: {},
    create: {
      email: 'executive@pettrack.com',
      phone: '+911234567891',
      firstName: 'Executive',
      lastName: 'User',
      role: UserRole.executive,
      isActive: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  await prisma.executive.upsert({
    where: { userId: executiveUser.id },
    update: {},
    create: {
      userId: executiveUser.id,
      employeeId: 'EMP001',
      territory: 'Mumbai',
      isActive: true,
    },
  });

  // Seed Demo Pet Owner
  console.log('🐕 Seeding demo pet owner...');
  
  const petOwnerUser = await prisma.user.upsert({
    where: { email: 'demo@pettrack.com' },
    update: {},
    create: {
      email: 'demo@pettrack.com',
      phone: '+911234567892',
      firstName: 'Demo',
      lastName: 'User',
      role: UserRole.pet_owner,
      isActive: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const petOwner = await prisma.petOwner.upsert({
    where: { userId: petOwnerUser.id },
    update: {},
    create: {
      userId: petOwnerUser.id,
      addressLine1: '123 Pet Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      countryCode: 'IN',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+911234567893',
    },
  });

  // Seed Demo Pet
  const labrador = await prisma.petBreed.findFirst({
    where: { breedName: 'Labrador Retriever' },
  });

  if (labrador) {
    await prisma.pet.upsert({
      where: { id: 'demo-pet-buddy' },
      update: {},
      create: {
        id: 'demo-pet-buddy',
        ownerId: petOwner.id,
        registeredBy: executiveUser.id,
        name: 'Buddy',
        speciesId: dogSpecies.id,
        breedId: labrador.id,
        gender: Gender.male,
        birthDate: new Date('2020-01-15'),
        color: 'Golden',
        weightKg: 25.5,
        heightCm: 60,
        distinctiveMarks: 'White patch on chest',
        isSpayedNeutered: true,
        microchipId: '982000123456789',
        specialNeeds: 'None',
        behavioralNotes: 'Friendly and energetic',
      },
    });
  }

  // Seed QR Code Pool
  console.log('🔗 Seeding QR code pool...');
  
  const qrPool = await prisma.qRCodePool.upsert({
    where: { poolName: 'Initial Pool 2025' },
    update: {},
    create: {
      poolName: 'Initial Pool 2025',
      totalCapacity: 10000,
      usedCount: 0,
      status: 'active',
    },
  });

  // Generate some QR codes
  console.log('📱 Generating sample QR codes...');
  
  const qrCodes = [];
  for (let i = 1; i <= 100; i++) {
    const qrCodeString = CryptoUtil.generateQRCodeString();
    const qrCodeHash = CryptoUtil.hashQRCode(qrCodeString);
    
    qrCodes.push({
      poolId: qrPool.id,
      qrCodeString,
      qrCodeHash,
      status: 'available',
    });
  }

  await prisma.qRCode.createMany({
    data: qrCodes,
    skipDuplicates: true,
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('');
  console.log('🔐 Demo Accounts:');
  console.log('Admin: admin@pettrack.com');
  console.log('Executive: executive@pettrack.com');
  console.log('Pet Owner: demo@pettrack.com');
  console.log('');
  console.log('📊 Seeded Data:');
  console.log(`- ${dogBreeds.length} dog breeds`);
  console.log(`- ${catBreeds.length} cat breeds`);
  console.log(`- ${birdBreeds.length} bird breeds`);
  console.log(`- ${vaccines.length} vaccine types`);
  console.log(`- 100 QR codes`);
  console.log('- 1 demo pet (Buddy)');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });