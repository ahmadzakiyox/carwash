// createAdmin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // Sesuaikan path jika perlu
require('dotenv').config();

const createAdminAccount = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log('MongoDB Connected for admin creation...');

    const adminEmail = 'admin@carwash.com';
    const adminPassword = 'PasswordSuperAman123'; // Ganti dengan password yang kuat

    // Cek apakah admin sudah ada
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin account already exists.');
      return;
    }

    // Jika belum ada, buat akun baru
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const newAdmin = new User({
      username: 'Admin Utama',
      email: adminEmail,
      password: hashedPassword,
      isVerified: true, // Langsung diverifikasi
      role: 'admin'     // Langsung sebagai admin
    });

    await newAdmin.save();
    console.log('Admin account created successfully!');

  } catch (error) {
    console.error('Error creating admin account:', error.message);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

createAdminAccount();   