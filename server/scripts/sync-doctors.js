import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

async function syncDoctors() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const hash = await bcrypt.hash('Password123!', 10);

  // Update doctor accounts to have Password123!
  const updateRes = await mongoose.connection.collection('users').updateMany(
    { role: 'doctor' },
    {
      $set: {
        password: hash,
        isVerified: true,
        verificationStatus: 'verified',
        isAvailableForBooking: true,
        workingHours: { start: '09:00', end: '18:00' },
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        consultationFee: 500,
        hospitalOrClinic: 'AyuRaksha Central Hospital',
      },
    }
  );

  console.log('Doctors updated:', updateRes.modifiedCount);

  // Check appointments for doctors
  const doctors = await mongoose.connection.collection('users').find({ role: 'doctor' }).toArray();
  for (const doc of doctors) {
    const aptCount = await mongoose.connection.collection('appointments').countDocuments({ doctorId: doc._id });
    console.log(`Doctor: ${doc.name} (${doc.email}) - Specialty: ${doc.specialization} - Live Appointments: ${aptCount}`);
  }

  await mongoose.disconnect();
}

syncDoctors().catch(console.error);
