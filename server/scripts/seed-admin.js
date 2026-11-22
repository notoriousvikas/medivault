import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function seedAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ayuraksha';
  console.log('Connecting to:', uri);
  await mongoose.connect(uri);

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // Update or insert admin@ayuraksha.io
  const res1 = await mongoose.connection.collection('users').updateOne(
    { email: 'admin@ayuraksha.io' },
    {
      $set: {
        name: 'Super Administrator',
        email: 'admin@ayuraksha.io',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        verificationStatus: 'verified',
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  // Also support admin@medivault.io for legacy demo click
  const res2 = await mongoose.connection.collection('users').updateOne(
    { email: 'admin@medivault.io' },
    {
      $set: {
        name: 'Super Administrator',
        email: 'admin@medivault.io',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        verificationStatus: 'verified',
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  // Ensure at least 1 pending doctor exists for verification testing
  await mongoose.connection.collection('users').updateOne(
    { email: 'vikasbaboria12@gmail.com' },
    {
      $set: {
        role: 'doctor',
        specialization: 'Pulmonology & Critical Care',
        licenseNumber: 'MH-MC-2024-9182',
        hospitalOrClinic: 'AyuRaksha Medical Center',
        isVerified: false,
        verificationStatus: 'pending',
      },
    }
  );

  console.log('Admin accounts configured successfully:', { ayuraksha: res1, medivault: res2 });
  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error('Seed admin error:', err);
  process.exit(1);
});
